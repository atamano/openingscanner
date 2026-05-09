"use client";

import type { LucideIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useDictionary } from "@/lib/i18n/context";
import { formatLastMove, renderPreview } from "@/lib/pgn/format";
import type { OpeningStats, RepertoireStats } from "@/lib/repertoire/aggregate";
import type { PlayerColor } from "@/lib/sources/types";
import { formatPct } from "@/lib/utils";

/**
 * Shape shared by StrongOpening and WeakOpening.
 */
interface RankedOpening {
  stats: OpeningStats;
  winPct: number;
  lossPct: number;
  drawPct: number;
}

/**
 * Shape shared by StrongVariation and WeakVariation.
 */
interface RankedVariation {
  path: string[];
  count: number;
  winPct: number;
  lossPct: number;
  drawPct: number;
}

type SpotsKind = "strong" | "weak";

interface SpotsPanelProps {
  kind: SpotsKind;
  stats: RepertoireStats;
  color: PlayerColor;
  selected: OpeningStats | null;
  /** Current move path on the board. Treated as a filter: variations must
   *  descend from it; openings must be compatible with it. */
  pathFilter: string[];
  onSelectOpening: (openingId: string) => void;
  onSelectVariation: (openingId: string, path: string[]) => void;
  icon: LucideIcon;
  /** Tailwind class for the header icon color (e.g. `text-emerald-500`). */
  iconClassName: string;
  /** Tailwind class for the stat pill text color (e.g. `text-emerald-500`). */
  statClassName: string;
  /** Tailwind classes merged into card-button hover state. */
  hoverClassName: string;
  computeOpenings: (
    stats: RepertoireStats,
    color: PlayerColor,
    limit: number,
  ) => RankedOpening[];
  computeVariations: (
    opening: OpeningStats,
    pathFilter: readonly string[],
  ) => RankedVariation[];
}

const PAGE_SIZE = 8;

/**
 * Shared panel used by StrongSpots and WeakSpots — the two widgets are
 * structurally identical and differ only in data source, icon, accent color,
 * and which dictionary section they read copy from.
 */
export function SpotsPanel({
  kind,
  stats,
  color,
  selected,
  pathFilter,
  onSelectOpening,
  onSelectVariation,
  icon: Icon,
  iconClassName,
  statClassName,
  hoverClassName,
  computeOpenings,
  computeVariations,
}: SpotsPanelProps) {
  const dict = useDictionary();
  const copy = kind === "strong" ? dict.strongSpots : dict.weakSpots;

  // Treat `pathFilter` as a scope filter on the board state:
  //   - With a selected opening: rank from the sub-tree at `pathFilter` so the
  //     "shallowest / deepest qualifying" pruning is evaluated within that
  //     sub-tree. Filtering after the fact would let an unrelated sibling
  //     branch silently drop everything below the user's current position.
  //   - Without a selected opening: keep only openings whose move sequence
  //     is compatible with `pathFilter` (shared prefix up to min length).
  const openings = useMemo(() => {
    if (selected) return [];
    const all = computeOpenings(stats, color, Number.MAX_SAFE_INTEGER);
    if (pathFilter.length === 0) return all;
    return all.filter((o) => {
      const moves = o.stats.entry?.moves ?? [];
      const minLen = Math.min(pathFilter.length, moves.length);
      for (let i = 0; i < minLen; i++) {
        if (pathFilter[i] !== moves[i]) return false;
      }
      return true;
    });
  }, [stats, color, selected, pathFilter, computeOpenings]);

  const variations = useMemo(
    () => (selected ? computeVariations(selected, pathFilter) : []),
    [selected, pathFilter, computeVariations],
  );

  const rowCount = selected ? variations.length : openings.length;

  const [visible, setVisible] = useState(PAGE_SIZE);
  useEffect(
    () => setVisible(PAGE_SIZE),
    [selected, color, stats, pathFilter],
  );

  // Coverage = how many of the player's games-on-this-color are accounted for
  // by the ranked openings. Anything filtered out (low sample, neutral score,
  // uncategorized) is invisible to the user otherwise — this reassures them
  // the panel hasn't dropped half their games silently.
  const coveredGames = useMemo(
    () =>
      selected
        ? 0
        : openings.reduce((acc, o) => acc + o.stats.gameCount, 0),
    [selected, openings],
  );
  const colorTotal = stats.colorBreakdown[color] ?? 0;

  if (rowCount === 0) return null;

  const shown = selected
    ? variations.slice(0, visible)
    : openings.slice(0, visible);
  const remaining = rowCount - shown.length;
  const descGlobal =
    color === "white" ? copy.descGlobalWhite : copy.descGlobalBlack;

  return (
    <Card>
      <CardHeader className="flex-row items-center gap-2 space-y-0">
        <Icon className={`size-4 ${iconClassName}`} />
        <div>
          <CardTitle>
            {selected && selected.entry
              ? copy.titleScoped.replace("{opening}", selected.entry.name)
              : copy.titleGlobal}
          </CardTitle>
          <CardDescription>
            {selected && selected.entry
              ? copy.descScoped.replace("{opening}", selected.entry.name)
              : descGlobal}
          </CardDescription>
          {!selected && colorTotal > 0 ? (
            <div className="mt-1 text-[11px] text-muted-foreground/80">
              {copy.coverageHint
                .replace("{covered}", String(coveredGames))
                .replace("{total}", String(colorTotal))}
            </div>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {selected
          ? (shown as RankedVariation[]).map((v) => (
              <button
                key={v.path.join(" ")}
                type="button"
                onClick={() =>
                  onSelectVariation(selected.openingId, v.path)
                }
                className={`group rounded-lg border bg-card p-3 text-left transition-colors ${hoverClassName}`}
              >
                <div className="mb-2 flex items-center gap-2">
                  <Badge variant="outline" className="font-mono">
                    {v.count}g
                  </Badge>
                  <span className={`text-xs tabular-nums ${statClassName}`}>
                    {formatPct(v.winPct, 1)}W · {formatPct(v.lossPct, 1)}L
                  </span>
                </div>
                <div className="font-medium">
                  {formatLastMove(selected.entry?.moves ?? [], v.path)}
                </div>
                <div className="mt-1 font-mono text-xs text-muted-foreground group-hover:text-foreground">
                  {renderPreview(
                    (selected.entry?.moves ?? []).concat(v.path),
                  )}
                </div>
              </button>
            ))
          : (shown as RankedOpening[]).map((w) => (
              <button
                key={w.stats.openingId}
                type="button"
                onClick={() => onSelectOpening(w.stats.openingId)}
                className={`group rounded-lg border bg-card p-3 text-left transition-colors ${hoverClassName}`}
              >
                <div className="mb-2 flex items-center gap-2">
                  {w.stats.entry?.eco ? (
                    <Badge variant="outline" className="font-mono">
                      {w.stats.entry.eco}
                    </Badge>
                  ) : null}
                  <span className={`text-xs tabular-nums ${statClassName}`}>
                    {formatPct(w.winPct, 1)}W · {formatPct(w.lossPct, 1)}L
                  </span>
                </div>
                <div className="line-clamp-1 font-medium">
                  {w.stats.entry?.name ?? dict.dashboard.uncategorized}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {w.stats.gameCount}{" "}
                  {w.stats.gameCount === 1
                    ? copy.gameSuffixOne
                    : copy.gameSuffixMany}{" "}
                  · {w.stats.entry?.family ?? "—"}
                </div>
              </button>
            ))}
      </CardContent>
      {remaining > 0 ? (
        <div className="flex items-center justify-center gap-2 border-t px-6 py-3 text-xs text-muted-foreground">
          <span>
            {copy.showingOf
              .replace("{shown}", String(shown.length))
              .replace("{total}", String(rowCount))}
          </span>
          <span>·</span>
          <button
            type="button"
            onClick={() =>
              setVisible((v) => Math.min(v + PAGE_SIZE, rowCount))
            }
            className="font-medium text-primary hover:underline"
          >
            {copy.showMore.replace(
              "{count}",
              String(Math.min(PAGE_SIZE, remaining)),
            )}
          </button>
          {visible > PAGE_SIZE ? (
            <>
              <span>·</span>
              <button
                type="button"
                onClick={() => setVisible(PAGE_SIZE)}
                className="font-medium hover:text-foreground hover:underline"
              >
                {copy.collapse}
              </button>
            </>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}
