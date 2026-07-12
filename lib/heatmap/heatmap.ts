import { Chess } from "chess.js";
import { fenToEpd, type EcoLabel } from "@/lib/catalog/eco-classify";
import type { MoveNode } from "@/lib/repertoire/aggregate";

/**
 * One board square, carrying every candidate move that lands on it.
 *
 * Squares — not moves — are the unit here, because the overlay paints squares.
 * Several legal moves routinely share a destination (`Nf3` and `f3` both land
 * on f3 from the very starting position; so do `Nxe5`/`dxe5` and `Rae1`/`Rfe1`
 * later on), so a cell aggregates them. Anything that kept only one move per
 * square would drop the others' games and leave the shares short of 100%.
 */
export interface HeatmapCell {
  /** Destination square in algebraic notation, e.g. "e4". Castling resolves to
   *  the king's destination (g1/c1/g8/c8). */
  square: string;
  /** Every SAN landing here, most-played first. Usually one. */
  sans: string[];
  /** Games across all of `sans`. */
  count: number;
  /** EPD after the most-played move landing here — what `openingName` names. */
  epd: string;
  /** count / max(count) over significant cells; drives the tint. */
  intensity: number;
  /** count / sum(counts), shown as the percentage label. */
  share: number;
  /** Opening reached by the most-played move, once labels resolve. */
  openingName: string | null;
  /** Whether this cell carries enough games to show the colored tint. */
  significant: boolean;
}

/**
 * A cell must clear BOTH bars to be tinted.
 *
 * The share bar keeps the gradient readable. The absolute floor is the one that
 * matters: without it a node holding 2 games paints a 50%-share square in
 * saturated red, which is exactly the "tiny sample dressed as signal" that
 * `confidence-badge` exists to prevent. Below either bar the label still
 * renders, just untinted.
 */
const MIN_SIGNIFICANT_SHARE = 0.03;
const MIN_SIGNIFICANT_GAMES = 5;

/**
 * Build the per-square overlay for the candidate next moves at a position.
 *
 * Pure and synchronous: it resolves geometry, counts and EPDs, but leaves
 * `openingName` null. Names come from the worker (which owns the ECO catalog)
 * and are applied afterwards by `labelHeatmap`.
 */
export function buildHeatmap(
  baseMoves: readonly string[],
  children: readonly MoveNode[],
): HeatmapCell[] {
  if (children.length === 0) return [];

  const chess = new Chess();
  for (const m of baseMoves) {
    try {
      chess.move(m);
    } catch {
      return [];
    }
  }

  // Group candidates by destination square, most-played move first so the
  // square inherits its EPD (and therefore its opening name) from the move a
  // reader would assume it means.
  const bySquare = new Map<string, { sans: string[]; count: number; epd: string }>();
  for (const child of [...children].sort((a, b) => b.count - a.count)) {
    let move;
    try {
      move = chess.move(child.san);
    } catch {
      continue;
    }
    if (!move) continue;
    const epd = fenToEpd(chess.fen());
    chess.undo();

    const cell = bySquare.get(move.to);
    if (cell) {
      cell.sans.push(child.san);
      cell.count += child.count;
    } else {
      bySquare.set(move.to, {
        sans: [child.san],
        count: child.count,
        epd,
      });
    }
  }

  const cells = [...bySquare.entries()];
  const sumCounts = cells.reduce((acc, [, c]) => acc + c.count, 0);

  const isSignificant = (count: number) =>
    count >= MIN_SIGNIFICANT_GAMES &&
    sumCounts > 0 &&
    count / sumCounts >= MIN_SIGNIFICANT_SHARE;

  // The tint is a *relative* scale: the most-played significant square is
  // always the hot end, whatever its absolute share. That keeps the gradient
  // legible on flat distributions, at the cost of not being comparable across
  // positions — the percentage label carries the absolute magnitude.
  const maxSignificantCount = cells.reduce(
    (acc, [, c]) => (isSignificant(c.count) ? Math.max(acc, c.count) : acc),
    0,
  );

  return cells.map(([square, c]) => {
    const significant = isSignificant(c.count);
    return {
      square,
      sans: c.sans,
      count: c.count,
      epd: c.epd,
      share: sumCounts > 0 ? c.count / sumCounts : 0,
      significant,
      intensity:
        significant && maxSignificantCount > 0
          ? c.count / maxSignificantCount
          : 0,
      openingName: null,
    };
  });
}

/** The EPDs `labelHeatmap` needs names for, in order. */
export function heatmapEpds(cells: readonly HeatmapCell[]): string[] {
  return cells.map((c) => c.epd);
}

/**
 * Attach opening names to cells. `labels` is positional against
 * `heatmapEpds(cells)`.
 */
export function labelHeatmap(
  cells: readonly HeatmapCell[],
  labels: readonly (EcoLabel | null)[],
  currentOpeningName: string | null,
): HeatmapCell[] {
  // When every *named* candidate sits in the same family, that family is
  // already implied by the position — strip it so each square shows only the
  // part that differentiates it. Needs at least two names to be a shared
  // prefix at all: with one, stripping would delete the only label there is.
  const families = new Set(
    labels.filter((l): l is EcoLabel => l !== null).map((l) => l.family),
  );
  const named = labels.filter(Boolean).length;
  const sharedFamily = named >= 2 && families.size === 1 ? [...families][0] : null;

  return cells.map((cell, i) => ({
    ...cell,
    openingName: pickOpeningLabel(
      labels[i] ?? null,
      sharedFamily,
      currentOpeningName,
    ),
  }));
}

/**
 * Pick the most useful label for a cell: the variation suffix when every
 * candidate shares a family, the full ECO name otherwise. Null when the label
 * would only restate the position the reader is already looking at.
 */
function pickOpeningLabel(
  label: EcoLabel | null,
  sharedFamily: string | null,
  currentOpeningName: string | null,
): string | null {
  if (!label) return null;
  if (sharedFamily) {
    // No suffix means this candidate IS the bare family — nothing to add when
    // every sibling already implies it.
    return variationSuffix(label.name, sharedFamily);
  }
  return label.name !== currentOpeningName ? label.name : null;
}

/**
 * Strip the family prefix from a full ECO name. Names in the Lichess catalog
 * follow patterns like `"Sicilian Defense"`, `"Sicilian Defense, Najdorf"`,
 * or `"Italian Game: Evans Gambit, Tartakower Attack"` — we try the common
 * separators in order and return what's left.
 */
function variationSuffix(name: string, family: string): string | null {
  if (name === family) return null;
  for (const sep of [", ", ": ", " "]) {
    const prefix = family + sep;
    if (name.startsWith(prefix)) {
      const suffix = name.slice(prefix.length).trim();
      return suffix.length > 0 ? suffix : null;
    }
  }
  return null;
}

/**
 * Overlay color for a cell, cold-to-hot: blue → purple → red, the short way
 * around the hue wheel (skipping green and yellow, which would fight the warm
 * wood board).
 *
 * Hue alone is a poor carrier — it's not perceptually ordered and it collapses
 * for red/blue color deficiency — so lightness and alpha ramp alongside it. The
 * hot end is darker, more opaque and more saturated, which survives grayscale
 * and lets the wood grain show through at the cold end.
 */
export function heatmapOverlayColor(intensity: number): string {
  const t = Math.max(0, Math.min(1, intensity));
  const hue = 230 + 130 * t;
  const lightness = 52 - 14 * t;
  const alpha = 0.62 + 0.3 * t;
  return `hsl(${hue.toFixed(1)} 75% ${lightness.toFixed(1)}% / ${alpha.toFixed(2)})`;
}
