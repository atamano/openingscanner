"use client";

import { Chess } from "chess.js";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  heatmapOverlayColor,
  type HeatmapCell,
} from "@/lib/heatmap/heatmap";
import { formatNumber } from "@/lib/utils";

const Chessboard = dynamic(
  () => import("react-chessboard").then((m) => m.Chessboard),
  { ssr: false, loading: () => <BoardSkeleton /> },
);

function BoardSkeleton() {
  return (
    <div className="aspect-square w-full animate-warm-pulse rounded-md bg-muted" />
  );
}

export function fenFromMoves(moves: readonly string[]): string {
  const chess = new Chess();
  for (const san of moves) {
    try {
      chess.move(san);
    } catch {
      break;
    }
  }
  return chess.fen();
}

/** One-direction duration of the heatmap fade. Matches the board's animation. */
const HEATMAP_FADE_MS = 140;

interface ChessBoardProps {
  moves: readonly string[];
  orientation?: "white" | "black";
  id?: string;
  heatmap?: readonly HeatmapCell[] | null;
}

export function ChessBoard({
  moves,
  orientation = "white",
  id,
  heatmap,
}: ChessBoardProps) {
  const fen = useMemo(() => fenFromMoves(moves), [moves]);

  // The "displayed" cells lag behind incoming heatmap props by one fade-out
  // step so the user sees the previous heatmap fade out before the new one
  // fades in. `phase` drives the opacity of the overlay/label divs via CSS
  // transition.
  //
  // We keep a ref alongside the state so the effect can read the current
  // displayed value without listing it as a dependency. Listing it caused a
  // bug: setting `displayed` inside the effect changed the dep, triggering an
  // immediate cleanup that cancelled the pending `requestAnimationFrame` for
  // phase="in" — so the heatmap stuck at opacity 0 after the first re-enable.
  const [displayed, setDisplayed] = useState<readonly HeatmapCell[] | null>(
    heatmap ?? null,
  );
  const displayedRef = useRef(displayed);
  const [phase, setPhase] = useState<"in" | "out">("in");

  useEffect(() => {
    if (heatmap === displayedRef.current) return;

    // First-paint enable (also fires on every re-enable after a previous
    // disable): swap in the new cells immediately at opacity 0, then fade
    // them up on the next frame so the CSS transition has a starting point.
    if (!displayedRef.current && heatmap) {
      displayedRef.current = heatmap;
      setDisplayed(heatmap);
      setPhase("out");
      const raf = requestAnimationFrame(() => setPhase("in"));
      return () => cancelAnimationFrame(raf);
    }

    // Otherwise: fade out → swap → fade in.
    setPhase("out");
    const t = setTimeout(() => {
      displayedRef.current = heatmap ?? null;
      setDisplayed(heatmap ?? null);
      setPhase("in");
    }, HEATMAP_FADE_MS);
    return () => clearTimeout(t);
  }, [heatmap]);

  const heatmapBySquare = useMemo(() => {
    const map = new Map<string, HeatmapCell>();
    if (displayed) {
      for (const cell of displayed) {
        // If two SANs land on the same square (rare; chess.js disambiguates
        // SANs already), the most-played wins.
        const existing = map.get(cell.square);
        if (!existing || cell.count > existing.count) {
          map.set(cell.square, cell);
        }
      }
    }
    return map;
  }, [displayed]);

  const squareRenderer = useMemo(() => {
    if (heatmapBySquare.size === 0) return undefined;
    const visible = phase === "in" ? 1 : 0;
    return function HeatmapSquare({
      square,
      children,
    }: {
      piece: { pieceType: string } | null;
      square: string;
      children?: React.ReactNode;
    }) {
      const cell = heatmapBySquare.get(square);
      return (
        <div
          style={{
            position: "relative",
            width: "100%",
            height: "100%",
            // Establish a size container so the heatmap label can scale its
            // stat line (`%·count`) using `cqi` units relative to the square,
            // not the viewport.
            containerType: "inline-size",
          }}
        >
          {cell?.significant ? (
            <div
              aria-hidden
              style={{
                position: "absolute",
                inset: 0,
                backgroundColor: heatmapOverlayColor(cell.intensity),
                // Subtle inner border to separate adjacent tinted cells from
                // each other and from neighbouring board squares.
                boxShadow: "inset 0 0 0 0.0625rem rgba(255,255,255,0.18)",
                opacity: visible,
                transition: `opacity ${HEATMAP_FADE_MS}ms ease-out`,
                pointerEvents: "none",
              }}
            />
          ) : null}
          <div style={{ position: "relative", width: "100%", height: "100%" }}>
            {children}
          </div>
          {cell ? (
            <HeatmapLabel cell={cell} opacity={visible} square={square} />
          ) : null}
        </div>
      );
    };
  }, [heatmapBySquare, phase]);

  return (
    <div className="wood-frame rounded-lg p-1.5">
      <div className="aspect-square w-full overflow-hidden rounded-sm">
        <Chessboard
          options={{
            id: id ?? "repertoire-board",
            position: fen,
            boardOrientation: orientation,
            allowDragging: false,
            lightSquareStyle: { backgroundColor: "var(--color-board-light)" },
            darkSquareStyle: { backgroundColor: "var(--color-board-dark)" },
            boardStyle: {
              borderRadius: "0",
            },
            animationDurationInMs: 150,
            squareRenderer,
          }}
        />
      </div>
    </div>
  );
}

/** True for squares where the board renders the cream "light" colour. */
function isLightSquare(square: string): boolean {
  const file = square.charCodeAt(0) - 97;
  const rank = Number(square.slice(1)) - 1;
  return (file + rank) % 2 !== 0;
}

/**
 * Render a share as a percentage with adaptive precision: integer for the
 * tinted "significant" cells, two-decimal for everything else (so a 1-game
 * outlier shows as `0.02%` instead of collapsing to `0%`). Trailing zeros
 * past the first decimal are trimmed for readability — `2.40 → 2.4`, but
 * `0.05` is left intact.
 */
function formatSharePct(share: number, significant: boolean): string {
  const pct = share * 100;
  if (significant) return `${Math.round(pct)}%`;
  const fixed = pct
    .toFixed(2)
    .replace(/(\.\d*?)0+$/, "$1")
    .replace(/\.$/, "");
  return `${fixed}%`;
}

function HeatmapLabel({
  cell,
  opacity,
  square,
}: {
  cell: HeatmapCell;
  opacity: number;
  square: string;
}) {
  // Significant cells round to whole percent (the headline use-case is "21%");
  // insignificant cells get hundredth-of-a-percent precision so a one-game
  // outlier doesn't collapse to the same `0%` as a never-played move.
  const sharePctText = formatSharePct(cell.share, cell.significant);
  // The stat line (`21% · 412`) keeps `whiteSpace: nowrap`, so wide numbers
  // would otherwise spill past the square. Scale the cqi target down with
  // character count — empirically, ~`120 / chars` lands the line inside the
  // square at our font weight (bold sans-serif digits run ~0.6em wide), with
  // a 16cqi cap so the common short-count case stays bold and readable.
  const statChars = `${sharePctText} · ${formatNumber(cell.count)}`.length;
  const statCqi = Math.min(16, 120 / Math.max(statChars, 1));
  // Tinted (significant) cells: white label on saturated blue→red — the
  // existing palette guarantees AA contrast at lightness 40%.
  // Untinted (insignificant) cells: pick a label colour that reads against
  // the raw board square below (warm cream or warm brown).
  const onTint = cell.significant;
  const lightSquare = isLightSquare(square);
  const color = onTint
    ? "#ffffff"
    : lightSquare
      ? "#1a1410" /* ink, reads on cream */
      : "#fff8eb" /* warm paper, reads on brown */;
  const textShadow = onTint
    ? "0 0.0625rem 0.125rem rgba(0,0,0,0.7), 0 0 0.0625rem rgba(0,0,0,0.55)"
    : lightSquare
      ? "0 0.0625rem 0.0625rem rgba(255,253,247,0.5)"
      : "0 0.0625rem 0.0625rem rgba(0,0,0,0.45)";
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "space-between",
        // Spacing also tied to the square's width so it scales in lockstep
        // with the typography — feels consistent at every board size.
        gap: "clamp(0.125rem, 3cqi, 0.375rem)",
        pointerEvents: "none",
        color,
        textShadow,
        fontFamily: "var(--font-sans, system-ui, sans-serif)",
        lineHeight: 1.15,
        textAlign: "center",
        padding: "clamp(0.0625rem, 4cqi, 0.25rem)",
        overflow: "hidden",
        opacity,
        transition: `opacity ${HEATMAP_FADE_MS}ms ease-out`,
      }}
    >
      {/* Always render the top slot — even empty — so the stats line stays
          pinned to the bottom of the square via `space-between`. */}
      <span
        style={{
          // `cqi` = 1% of the size container's inline width. Sized off the
          // square (the wrapper sets `container-type: inline-size`) rather
          // than the viewport, so the label always reads at a sensible size
          // regardless of how the board is laid out.
          fontSize: "clamp(0.5rem, 18cqi, 1rem)",
          fontWeight: 500,
          maxWidth: "100%",
          // Wrap on word boundaries when there's vertical room; only break
          // mid-word as a last resort to avoid horizontal overflow.
          whiteSpace: "normal",
          wordBreak: "normal",
          overflowWrap: "break-word",
          // Clamp to 3 lines so very long opening names truncate with an
          // ellipsis instead of spilling onto neighbouring squares.
          display: "-webkit-box",
          WebkitBoxOrient: "vertical",
          WebkitLineClamp: 3,
          overflow: "hidden",
        }}
        title={cell.openingName ?? undefined}
      >
        {cell.openingName ?? ""}
      </span>
      <span
        style={{
          // `cqi` = 1% of the size container's inline width — the wrapper in
          // squareRenderer above sets `container-type: inline-size`. Per-cell
          // `statCqi` (computed up top) scales the target down for long
          // strings like `49% · 1,071` so they don't overflow the square.
          fontSize: `clamp(0.6rem, ${statCqi.toFixed(2)}cqi, 1.125rem)`,
          fontWeight: 700,
          display: "inline-flex",
          alignItems: "baseline",
          // Gap also scales with the square so it shrinks alongside the text
          // when long counts force the font down.
          gap: "clamp(0.0625rem, 1.5cqi, 0.25rem)",
          // Keep `21% · 412` on a single line — never wrap to two lines.
          whiteSpace: "nowrap",
          maxWidth: "100%",
        }}
      >
        <span>{sharePctText}</span>
        <span>· {formatNumber(cell.count)}</span>
      </span>
    </div>
  );
}
