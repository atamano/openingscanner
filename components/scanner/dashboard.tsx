"use client";

import { Info } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChessBoard } from "@/components/chess/chess-board";
import { ContinuationsPanel } from "@/components/scanner/continuations-panel";
import { ExportMenu } from "@/components/scanner/export-menu";
import { GapAnalysis } from "@/components/scanner/gap-analysis";
import { RepertoireList } from "@/components/scanner/repertoire-list";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";
import { UNCATEGORIZED_ID } from "@/lib/catalog/openings";
import type { MoveNode, OpeningStats, RepertoireStats } from "@/lib/repertoire/aggregate";
import type { PlayerColor } from "@/lib/sources/types";
import { cn, formatNumber, formatPct } from "@/lib/utils";

interface DashboardProps {
  stats: RepertoireStats;
}

export function Dashboard({ stats }: DashboardProps) {
  const availableColors = useMemo<PlayerColor[]>(() => {
    const out: PlayerColor[] = [];
    if (stats.colorBreakdown.white > 0) out.push("white");
    if (stats.colorBreakdown.black > 0) out.push("black");
    return out;
  }, [stats.colorBreakdown]);

  const [color, setColor] = useState<PlayerColor>(availableColors[0] ?? "white");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [path, setPath] = useState<string[]>([]);
  const [previewMoves, setPreviewMoves] = useState<string[] | null>(null);

  const rowsForColor = useMemo(
    () =>
      Object.values(stats.byOpening)
        .filter(
          (s) => s.entry?.color === color || s.openingId === UNCATEGORIZED_ID,
        )
        .sort((a, b) => b.gameCount - a.gameCount),
    [stats, color],
  );

  const total = useMemo(
    () => rowsForColor.reduce((acc, s) => acc + s.gameCount, 0),
    [rowsForColor],
  );

  useEffect(() => {
    const withEntry = rowsForColor.find((s) => s.entry);
    setSelectedId(withEntry?.openingId ?? rowsForColor[0]?.openingId ?? null);
    setPreviewMoves(null);
    setPath([]);
  }, [color, stats, rowsForColor]);

  const selected = selectedId ? stats.byOpening[selectedId] : null;
  const baseMoves = selected?.entry?.moves ?? [];
  const boardMoves = previewMoves ?? [...baseMoves, ...path];

  useEffect(() => {
    setPath([]);
    setPreviewMoves(null);
  }, [selectedId]);

  const continuationsRoot = useMemo<MoveNode>(
    () => selected?.tree ?? emptyNode(),
    [selected],
  );

  const push = useCallback((san: string) => setPath((p) => [...p, san]), []);
  const pop = useCallback(() => setPath((p) => p.slice(0, -1)), []);
  const resetPath = useCallback(() => setPath([]), []);

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            {stats.username}&apos;s repertoire
          </h2>
          <p className="text-sm text-muted-foreground">
            {formatNumber(stats.totalGames)} games scanned ·{" "}
            {formatNumber(stats.colorBreakdown.white)} as White,{" "}
            {formatNumber(stats.colorBreakdown.black)} as Black ·{" "}
            {formatNumber(stats.totalClassified)} categorized
          </p>
        </div>
        <div className="flex items-center gap-3">
          {availableColors.length > 1 ? (
            <ToggleGroup
              type="single"
              value={color}
              onValueChange={(v) => v && setColor(v as PlayerColor)}
            >
              <ToggleGroupItem value="white">
                White ({formatNumber(stats.colorBreakdown.white)})
              </ToggleGroupItem>
              <ToggleGroupItem value="black">
                Black ({formatNumber(stats.colorBreakdown.black)})
              </ToggleGroupItem>
            </ToggleGroup>
          ) : null}
          <ExportMenu stats={stats} />
        </div>
      </header>

      {/* KPI strip — top 6 openings for quick selection */}
      <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {rowsForColor.slice(0, 6).map((s) => {
          const pct = total ? s.gameCount / total : 0;
          const winPct = s.gameCount ? s.playerWins / s.gameCount : 0;
          const drawPct = s.gameCount ? s.draws / s.gameCount : 0;
          const lossPct = s.gameCount ? s.playerLosses / s.gameCount : 0;
          const active = s.openingId === selectedId;
          return (
            <button
              type="button"
              key={s.openingId}
              onClick={() => setSelectedId(s.openingId)}
              className={cn(
                "flex flex-col gap-1 rounded-lg border bg-card p-2.5 text-left transition-colors",
                active
                  ? "border-primary/60 bg-primary/5"
                  : "hover:bg-accent/30",
              )}
            >
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <span className="font-mono">{s.entry?.eco ?? "—"}</span>
                <span className="ml-auto font-mono tabular-nums text-foreground">
                  {s.gameCount}
                </span>
              </div>
              <div className="line-clamp-2 text-xs font-medium leading-tight">
                {s.entry?.name?.split(":").pop()?.trim() ?? "Uncategorized"}
              </div>
              <div className="flex h-1 overflow-hidden rounded-full bg-muted">
                <span
                  className="bg-emerald-500/85"
                  style={{ width: `${winPct * 100}%` }}
                />
                <span
                  className="bg-amber-400/70"
                  style={{ width: `${drawPct * 100}%` }}
                />
                <span
                  className="bg-rose-500/70"
                  style={{ width: `${lossPct * 100}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] tabular-nums text-muted-foreground">
                <span>{formatPct(pct, 0)}</span>
                <span className="text-emerald-500">{formatPct(winPct, 0)}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Main 3-col grid */}
      <div className="grid items-stretch gap-3 xl:h-[calc(100dvh-22rem)] xl:grid-cols-[minmax(0,1fr)_minmax(0,460px)_minmax(300px,360px)]">
        <RepertoireList
          stats={stats}
          color={color}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />

        <div className="flex min-w-0 min-h-0 flex-col overflow-y-auto rounded-xl border bg-card p-3 xl:h-full">
          {previewMoves ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Info className="size-3.5" />
                Preview of a recommended line — not yet in the player&apos;s games.
                <button
                  type="button"
                  onClick={() => setPreviewMoves(null)}
                  className="ml-auto text-primary hover:underline"
                >
                  Close preview
                </button>
              </div>
              <ChessBoard moves={previewMoves} orientation={color} />
            </div>
          ) : selected ? (
            <CenterPanel stats={selected} color={color} boardMoves={boardMoves} />
          ) : (
            <div className="grid h-full place-items-center text-sm text-muted-foreground">
              Pick an opening to drill in.
            </div>
          )}
        </div>

        {selected && !previewMoves ? (
          <ContinuationsPanel
            root={continuationsRoot}
            path={path}
            baseDepth={baseMoves.length}
            onPush={push}
            onPop={pop}
            onReset={resetPath}
          />
        ) : (
          <div className="hidden rounded-xl border bg-card xl:block" />
        )}
      </div>

      <GapAnalysis
        stats={stats}
        color={color}
        onSelect={(moves) => setPreviewMoves(moves)}
      />
    </section>
  );
}

function CenterPanel({
  stats,
  boardMoves,
}: {
  stats: OpeningStats;
  color: PlayerColor;
  boardMoves: string[];
}) {
  const winPct = stats.gameCount ? stats.playerWins / stats.gameCount : 0;
  const drawPct = stats.gameCount ? stats.draws / stats.gameCount : 0;
  const lossPct = stats.gameCount ? stats.playerLosses / stats.gameCount : 0;

  return (
    <div className="flex flex-col gap-3">
      <div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {stats.entry?.eco ? (
            <span className="font-mono">{stats.entry.eco}</span>
          ) : null}
          {stats.entry?.family ? (
            <>
              <span>·</span>
              <span className="truncate">{stats.entry.family}</span>
            </>
          ) : null}
        </div>
        <div className="mt-0.5 text-sm font-semibold leading-tight">
          {stats.entry?.name ?? "Uncategorized"}
        </div>
      </div>

      <ChessBoard moves={boardMoves} orientation="white" />

      <div className="grid grid-cols-4 gap-2 text-xs">
        <MiniKpi label="N" value={stats.gameCount} />
        <MiniKpi label="W%" value={formatPct(winPct, 0)} accent="emerald" />
        <MiniKpi label="D%" value={formatPct(drawPct, 0)} accent="amber" />
        <MiniKpi label="L%" value={formatPct(lossPct, 0)} accent="rose" />
      </div>

      {stats.avgOpponentRating ? (
        <div className="rounded-md border bg-background/40 px-3 py-1.5 text-center text-xs text-muted-foreground">
          Avg opp. rating ·{" "}
          <span className="font-mono tabular-nums text-foreground">
            {Math.round(stats.avgOpponentRating)}
          </span>
        </div>
      ) : null}
    </div>
  );
}

function MiniKpi({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: "emerald" | "amber" | "rose";
}) {
  const accentClass =
    accent === "emerald"
      ? "text-emerald-500"
      : accent === "amber"
        ? "text-amber-500"
        : accent === "rose"
          ? "text-rose-500"
          : "text-foreground";
  return (
    <div className="rounded-md border bg-background/40 px-2 py-1.5 text-center">
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className={`font-mono text-sm font-semibold ${accentClass}`}>
        {value}
      </div>
    </div>
  );
}

function emptyNode(): MoveNode {
  return {
    san: "",
    count: 0,
    playerWins: 0,
    draws: 0,
    playerLosses: 0,
    children: {},
  };
}
