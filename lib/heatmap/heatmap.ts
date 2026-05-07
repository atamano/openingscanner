import { Chess } from "chess.js";
import { fenToEpd } from "@/lib/catalog/eco-classify";
import type { EcoLookup, EcoLookupResult } from "@/hooks/use-eco-lookup";
import type { MoveNode } from "@/lib/repertoire/aggregate";

export interface HeatmapCell {
  /** Destination square in algebraic notation, e.g. "e4". */
  square: string;
  san: string;
  count: number;
  /** count / max(counts) over significant cells; drives the hue. */
  intensity: number;
  /** count / sum(counts), shown as the percentage label. */
  share: number;
  /** Name of the ECO opening reached after playing this move, when known. */
  openingName: string | null;
  /** Whether this cell's share is large enough to show the colored tint. */
  significant: boolean;
}

/**
 * Below this share-of-games, a continuation is treated as anecdotal and the
 * cell drops the colored tint (the label still renders, but with a font color
 * tuned to the underlying board square instead of the heatmap palette).
 */
const MIN_SIGNIFICANT_SHARE = 0.03;

/**
 * Build per-square heatmap stats for the candidate next moves at the current
 * board position. Cells are keyed by the move's destination square — castling
 * resolves to the king's destination square (g1/c1/g8/c8), which lines up
 * with how players think of "where the move went".
 */
export function buildHeatmap(
  baseMoves: readonly string[],
  children: readonly MoveNode[],
  ecoLookup: EcoLookup | null,
  currentOpeningName: string | null,
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

  const sumCounts = children.reduce((acc, c) => acc + c.count, 0);
  // Intensity (used to pick the hue) is normalised against the most-played
  // significant continuation so that one runaway popular move doesn't compress
  // the rest of the gradient. Insignificant cells fall back to intensity=0.
  const maxSignificantCount = children.reduce((acc, c) => {
    const share = sumCounts > 0 ? c.count / sumCounts : 0;
    return share >= MIN_SIGNIFICANT_SHARE ? Math.max(acc, c.count) : acc;
  }, 0);

  // First pass: walk the candidates, collect raw ECO lookups per cell. We
  // need to know the full set of (name, family) pairs before we can decide
  // whether to prefer variation suffixes over full names.
  type Raw = Omit<HeatmapCell, "openingName"> & {
    eco: EcoLookupResult | null;
  };
  const raw: Raw[] = [];
  for (const child of children) {
    let move;
    try {
      move = chess.move(child.san);
    } catch {
      continue;
    }
    if (!move) continue;

    const epd = fenToEpd(chess.fen());
    const eco = ecoLookup ? ecoLookup(epd) : null;
    chess.undo();

    const total = child.count;
    const share = sumCounts > 0 ? total / sumCounts : 0;
    const significant = share >= MIN_SIGNIFICANT_SHARE;
    raw.push({
      san: child.san,
      square: move.to,
      count: total,
      share,
      significant,
      intensity:
        significant && maxSignificantCount > 0
          ? total / maxSignificantCount
          : 0,
      eco,
    });
  }

  // If every continuation with an ECO match shares the same family, the
  // family name is redundant on every cell — strip it down to the variation
  // suffix so each square shows the differentiating part instead.
  const families = new Set(raw.map((r) => r.eco?.family).filter(Boolean));
  const sharedFamily = families.size === 1 ? [...families][0] : null;

  return raw.map(({ eco, ...rest }) => ({
    ...rest,
    openingName: pickOpeningLabel(eco, sharedFamily, currentOpeningName),
  }));
}

/**
 * Pick the most useful label for a heatmap cell: the variation suffix when
 * every candidate shares a family, the full ECO name otherwise. Falls back
 * to null when the resulting label would be redundant with the current
 * position's opening, or when no ECO match exists.
 */
function pickOpeningLabel(
  eco: EcoLookupResult | null,
  sharedFamily: string | null | undefined,
  currentOpeningName: string | null,
): string | null {
  if (!eco) return null;
  if (sharedFamily) {
    const suffix = variationSuffix(eco.name, sharedFamily);
    if (suffix) return suffix;
    // No suffix means this candidate IS the bare family — nothing useful to
    // add when every other cell already implies it.
    return null;
  }
  return eco.name !== currentOpeningName ? eco.name : null;
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
 * Overlay color for a heatmap cell on a straight cold-to-hot scale: saturated
 * blue → purple → red, the short way around the hue wheel (skipping green and
 * yellow, which would clash with the warm wood board). Saturation, lightness
 * and alpha are held constant so white label text keeps the same legibility
 * across the whole gradient — only the hue carries the signal.
 */
export function heatmapOverlayColor(intensity: number): string {
  const clamped = Math.max(0, Math.min(1, intensity));
  const hue = (230 + 130 * clamped) % 360;
  // Lightness held at 40% so white label text clears WCAG AA contrast across
  // the whole hue range — pure red at 45%+ would drop the red end below AA.
  return `hsl(${hue.toFixed(1)}, 75%, 40%)`;
}
