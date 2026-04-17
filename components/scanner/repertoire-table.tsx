"use client";

import { useMemo, useState } from "react";
import { UNCATEGORIZED_ID, UNCATEGORIZED_LABEL } from "@/lib/catalog/openings";
import type { OpeningStats, RepertoireStats } from "@/lib/repertoire/aggregate";
import type { PlayerColor } from "@/lib/sources/types";
import { cn, formatPct } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface RepertoireTableProps {
  stats: RepertoireStats;
  color: PlayerColor;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

type SortKey = "count" | "win" | "elo";

export function RepertoireTable({
  stats,
  color,
  selectedId,
  onSelect,
}: RepertoireTableProps) {
  const [sort, setSort] = useState<SortKey>("count");

  const rows = useMemo(() => {
    const forColor = Object.values(stats.byOpening).filter((s) => {
      if (s.openingId === UNCATEGORIZED_ID) return true; // keep at bottom
      return s.entry?.color === color;
    });
    const total = forColor
      .filter((s) => s.openingId !== UNCATEGORIZED_ID)
      .reduce((acc, s) => acc + s.gameCount, 0)
      + (forColor.find((s) => s.openingId === UNCATEGORIZED_ID)?.gameCount ?? 0);
    const ranked = forColor
      .filter((s) => s.openingId !== UNCATEGORIZED_ID)
      .sort((a, b) => compare(a, b, sort));
    const unc = forColor.find((s) => s.openingId === UNCATEGORIZED_ID);
    return { rows: ranked, uncategorized: unc, total };
  }, [stats, color, sort]);

  if (rows.rows.length === 0 && !rows.uncategorized) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
        No {color} games in this scan.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="max-h-[480px] overflow-y-auto">
        <table className="w-full border-separate border-spacing-0 text-sm">
          <thead className="sticky top-0 z-10 bg-card/95 backdrop-blur">
            <tr className="text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-2 text-left font-medium">Opening</th>
              <ThSort active={sort === "count"} onClick={() => setSort("count")}>
                Games
              </ThSort>
              <ThSort active={sort === "win"} onClick={() => setSort("win")}>
                Win%
              </ThSort>
              <ThSort active={sort === "elo"} onClick={() => setSort("elo")}>
                Avg opp.
              </ThSort>
            </tr>
          </thead>
          <tbody>
            {rows.rows.map((s) => (
              <Row
                key={s.openingId}
                stats={s}
                total={rows.total}
                selected={selectedId === s.openingId}
                onSelect={() => onSelect(s.openingId)}
              />
            ))}
            {rows.uncategorized ? (
              <Row
                key="uncategorized"
                stats={rows.uncategorized}
                total={rows.total}
                uncategorized
                selected={selectedId === UNCATEGORIZED_ID}
                onSelect={() => onSelect(UNCATEGORIZED_ID)}
              />
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ThSort({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <th className="px-4 py-2 text-right font-medium">
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "inline-flex items-center gap-1 text-xs uppercase tracking-wide hover:text-foreground",
          active ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {children}
      </button>
    </th>
  );
}

function Row({
  stats,
  total,
  selected,
  onSelect,
  uncategorized,
}: {
  stats: OpeningStats;
  total: number;
  selected: boolean;
  onSelect: () => void;
  uncategorized?: boolean;
}) {
  const pct = total ? stats.gameCount / total : 0;
  const winPct = stats.gameCount ? stats.playerWins / stats.gameCount : 0;
  const drawPct = stats.gameCount ? stats.draws / stats.gameCount : 0;
  const lossPct = stats.gameCount ? stats.playerLosses / stats.gameCount : 0;
  const label = uncategorized ? UNCATEGORIZED_LABEL : stats.entry?.name ?? stats.openingId;
  const family = !uncategorized ? stats.entry?.family : "Out of catalog";

  return (
    <tr
      onClick={onSelect}
      className={cn(
        "cursor-pointer border-t transition-colors",
        selected
          ? "bg-primary/5"
          : "hover:bg-accent/40",
      )}
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          {!uncategorized && stats.entry?.eco ? (
            <Badge variant="outline" className="font-mono">{stats.entry.eco}</Badge>
          ) : null}
          <div>
            <div className="font-medium">{label}</div>
            {family ? (
              <div className="text-xs text-muted-foreground">{family}</div>
            ) : null}
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-right">
        <div className="font-mono tabular-nums">{stats.gameCount}</div>
        <div className="text-xs text-muted-foreground">{formatPct(pct, 0)}</div>
      </td>
      <td className="px-4 py-3 text-right">
        <div className="font-mono tabular-nums">{formatPct(winPct, 0)}</div>
        <ScoreBar
          win={winPct}
          draw={drawPct}
          loss={lossPct}
        />
      </td>
      <td className="px-4 py-3 text-right font-mono tabular-nums text-muted-foreground">
        {stats.avgOpponentRating ? Math.round(stats.avgOpponentRating) : "—"}
      </td>
    </tr>
  );
}

function ScoreBar({ win, draw, loss }: { win: number; draw: number; loss: number }) {
  return (
    <div className="mt-1 ml-auto flex h-1 w-20 overflow-hidden rounded-full bg-muted">
      <span className="bg-emerald-500" style={{ width: `${win * 100}%` }} />
      <span className="bg-amber-400/70" style={{ width: `${draw * 100}%` }} />
      <span className="bg-rose-500/80" style={{ width: `${loss * 100}%` }} />
    </div>
  );
}

function compare(a: OpeningStats, b: OpeningStats, key: SortKey): number {
  if (key === "count") return b.gameCount - a.gameCount;
  if (key === "win") {
    const wa = a.gameCount ? a.playerWins / a.gameCount : 0;
    const wb = b.gameCount ? b.playerWins / b.gameCount : 0;
    return wb - wa;
  }
  return (b.avgOpponentRating ?? 0) - (a.avgOpponentRating ?? 0);
}
