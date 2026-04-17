"use client";

import { AlertTriangle } from "lucide-react";
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
import type { OpeningStats, RepertoireStats } from "@/lib/repertoire/aggregate";
import {
  computeWeakOpenings,
  computeWeakVariations,
} from "@/lib/repertoire/weaknesses";
import type { PlayerColor } from "@/lib/sources/types";
import { formatPct } from "@/lib/utils";

interface WeakSpotsProps {
  stats: RepertoireStats;
  color: PlayerColor;
  selected: OpeningStats | null;
  onSelectOpening: (openingId: string) => void;
  onSelectVariation: (openingId: string, path: string[]) => void;
}

const PAGE_SIZE = 8;

export function WeakSpots({
  stats,
  color,
  selected,
  onSelectOpening,
  onSelectVariation,
}: WeakSpotsProps) {
  const dict = useDictionary();
  const weakOpenings = useMemo(
    () =>
      selected
        ? []
        : computeWeakOpenings(stats, color, Number.MAX_SAFE_INTEGER),
    [stats, color, selected],
  );

  const weakVariations = useMemo(
    () => (selected ? computeWeakVariations(selected) : []),
    [selected],
  );

  const rowCount = selected ? weakVariations.length : weakOpenings.length;

  const [visible, setVisible] = useState(PAGE_SIZE);
  useEffect(() => setVisible(PAGE_SIZE), [selected, color, stats]);

  if (rowCount === 0) return null;

  const shown = selected
    ? weakVariations.slice(0, visible)
    : weakOpenings.slice(0, visible);
  const remaining = rowCount - shown.length;
  const colorLabel =
    color === "white" ? dict.form.colorWhite : dict.form.colorBlack;

  return (
    <Card>
      <CardHeader className="flex-row items-center gap-2 space-y-0">
        <AlertTriangle className="size-4 text-rose-500" />
        <div>
          <CardTitle>
            {selected
              ? dict.weakSpots.titleScoped
              : dict.weakSpots.titleGlobal}
          </CardTitle>
          <CardDescription>
            {selected && selected.entry
              ? dict.weakSpots.descScoped.replace(
                  "{opening}",
                  selected.entry.name,
                )
              : dict.weakSpots.descGlobal.replace(
                  "{color}",
                  colorLabel.toLowerCase(),
                )}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {selected
          ? (shown as ReturnType<typeof computeWeakVariations>).map((v) => (
              <button
                key={v.path.join(" ")}
                type="button"
                onClick={() =>
                  onSelectVariation(selected.openingId, v.path)
                }
                className="group rounded-lg border bg-card p-3 text-left transition-colors hover:border-rose-500/60 hover:bg-rose-500/5"
              >
                <div className="mb-2 flex items-center gap-2">
                  <Badge variant="outline" className="font-mono">
                    {v.count}g
                  </Badge>
                  <span className="text-xs text-rose-500 tabular-nums">
                    {formatPct(v.winPct, 0)}W · {formatPct(v.lossPct, 0)}L
                  </span>
                </div>
                <div className="font-medium">
                  {formatLastMove(
                    selected.entry?.moves ?? [],
                    v.path,
                  )}
                </div>
                <div className="mt-1 font-mono text-xs text-muted-foreground group-hover:text-foreground">
                  {renderPreview(
                    (selected.entry?.moves ?? []).concat(v.path),
                  )}
                </div>
              </button>
            ))
          : (shown as ReturnType<typeof computeWeakOpenings>).map((w) => (
              <button
                key={w.stats.openingId}
                type="button"
                onClick={() => onSelectOpening(w.stats.openingId)}
                className="group rounded-lg border bg-card p-3 text-left transition-colors hover:border-rose-500/60 hover:bg-rose-500/5"
              >
                <div className="mb-2 flex items-center gap-2">
                  {w.stats.entry?.eco ? (
                    <Badge variant="outline" className="font-mono">
                      {w.stats.entry.eco}
                    </Badge>
                  ) : null}
                  <span className="text-xs text-rose-500 tabular-nums">
                    {formatPct(w.winPct, 0)}W · {formatPct(w.lossPct, 0)}L
                  </span>
                </div>
                <div className="line-clamp-1 font-medium">
                  {w.stats.entry?.name ?? dict.dashboard.uncategorized}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {w.stats.gameCount}{" "}
                  {w.stats.gameCount === 1
                    ? dict.weakSpots.gameSuffixOne
                    : dict.weakSpots.gameSuffixMany}{" "}
                  · {w.stats.entry?.family ?? "—"}
                </div>
              </button>
            ))}
      </CardContent>
      {remaining > 0 ? (
        <div className="flex items-center justify-center gap-2 border-t px-6 py-3 text-xs text-muted-foreground">
          <span>
            {dict.weakSpots.showingOf
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
            {dict.weakSpots.showMore.replace(
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
                {dict.weakSpots.collapse}
              </button>
            </>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}

function formatLastMove(
  baseMoves: readonly string[],
  pathMoves: readonly string[],
): string {
  const last = pathMoves[pathMoves.length - 1];
  if (!last) return "";
  const totalPly = baseMoves.length + pathMoves.length;
  const moveNumber = Math.ceil(totalPly / 2);
  const isBlack = totalPly % 2 === 0;
  return isBlack ? `${moveNumber}... ${last}` : `${moveNumber}. ${last}`;
}

function renderPreview(sans: readonly string[]): string {
  const limit = Math.min(sans.length, 10);
  const out: string[] = [];
  for (let i = 0; i < limit; i++) {
    if (i % 2 === 0) out.push(`${i / 2 + 1}.`);
    out.push(sans[i]);
  }
  return out.join(" ") + (sans.length > limit ? " …" : "");
}
