"use client";

import { GitBranch, Info, MousePointerClick } from "lucide-react";
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
import {
  buildGlobalTree,
  type MoveNode,
  type OpeningStats,
  type RepertoireStats,
} from "@/lib/repertoire/aggregate";
import type { PlayerColor } from "@/lib/sources/types";
import { formatNumber, formatPct } from "@/lib/utils";

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

  // Reset drill state when color/stats change, but don't auto-select:
  // the user should see a clean starting position until they pick an opening.
  useEffect(() => {
    setSelectedId(null);
    setPreviewMoves(null);
    setPath([]);
  }, [color, stats]);

  const selected = selectedId ? stats.byOpening[selectedId] : null;
  const baseMoves = selected?.entry?.moves ?? [];
  const boardMoves = previewMoves ?? [...baseMoves, ...path];

  useEffect(() => {
    setPath([]);
    setPreviewMoves(null);
  }, [selectedId]);

  // Pre-aggregated move tree across *all* games of the current color. Used
  // when no opening is selected so the Continuations panel stays useful from
  // the initial position.
  const globalTree = useMemo<MoveNode>(
    () => buildGlobalTree(stats, color),
    [stats, color],
  );

  const continuationsRoot = useMemo<MoveNode>(
    () => selected?.tree ?? globalTree,
    [selected, globalTree],
  );

  const push = useCallback((san: string) => setPath((p) => [...p, san]), []);
  const pop = useCallback(() => setPath((p) => p.slice(0, -1)), []);
  const resetPath = useCallback(() => setPath([]), []);

  // Sorted children at the current path position — used both by the keyboard
  // handler and the Continuations panel, so they stay in sync. Walks whichever
  // tree is currently in play (opening-specific, or global).
  const currentChildren = useMemo<MoveNode[]>(() => {
    let node = continuationsRoot;
    for (const san of path) {
      const next = node.children[san];
      if (!next) return [];
      node = next;
    }
    return Object.values(node.children).sort((a, b) => b.count - a.count);
  }, [continuationsRoot, path]);

  const [focusIndex, setFocusIndex] = useState(0);
  useEffect(() => setFocusIndex(0), [selectedId, path]);

  const focusedSan = currentChildren[focusIndex]?.san ?? null;

  // Arrow-key navigation through the continuation tree.
  //  ←   pop one ply
  //  →   push the focused continuation (defaults to the most-played one)
  //  ↑/↓ cycle the focus through alternative continuations
  // Home reset to the opening position
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable) {
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setPath((p) => p.slice(0, -1));
        return;
      }

      if (e.key === "ArrowRight" || e.key === "Enter") {
        const san = currentChildren[focusIndex]?.san;
        if (!san) return;
        e.preventDefault();
        setPath((p) => [...p, san]);
      } else if (e.key === "ArrowDown") {
        if (currentChildren.length === 0) return;
        e.preventDefault();
        setFocusIndex((i) => Math.min(i + 1, currentChildren.length - 1));
      } else if (e.key === "ArrowUp") {
        if (currentChildren.length === 0) return;
        e.preventDefault();
        setFocusIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Home") {
        e.preventDefault();
        setPath([]);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [currentChildren, focusIndex]);

  return (
    <section className="space-y-3">
      {/* Main 3-col grid — board gets first-screen prominence. */}
      <div className="grid items-stretch gap-3 xl:h-[calc(100dvh-6rem)] xl:grid-cols-[minmax(0,1fr)_minmax(0,460px)_minmax(300px,360px)]">
        <RepertoireList
          stats={stats}
          color={color}
          selectedId={selectedId}
          onSelect={setSelectedId}
          headerAction={
            availableColors.length > 1 ? (
              <ToggleGroup
                type="single"
                value={color}
                onValueChange={(v) => v && setColor(v as PlayerColor)}
                aria-label="Filter by color"
              >
                <ToggleGroupItem
                  value="white"
                  title={`White (${formatNumber(stats.colorBreakdown.white)} games)`}
                  className="px-2 font-mono text-xs"
                >
                  W
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="black"
                  title={`Black (${formatNumber(stats.colorBreakdown.black)} games)`}
                  className="px-2 font-mono text-xs"
                >
                  B
                </ToggleGroupItem>
              </ToggleGroup>
            ) : null
          }
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
              <div className="mx-auto w-full max-w-[min(100%,calc(100dvh-20rem))]">
                <ChessBoard moves={previewMoves} orientation={color} />
              </div>
            </div>
          ) : (
            (() => {
              const exportAction = (
                <ExportMenu
                  stats={stats}
                  color={color}
                  selectedOpeningId={selectedId}
                  path={path}
                />
              );
              return selected ? (
                <CenterPanel
                  stats={selected}
                  color={color}
                  boardMoves={boardMoves}
                  actions={exportAction}
                />
              ) : (
                <EmptyCenterPanel
                  color={color}
                  boardMoves={boardMoves}
                  actions={exportAction}
                />
              );
            })()
          )}
        </div>

        {previewMoves ? (
          <EmptyContinuationsPanel previewing />
        ) : (
          <ContinuationsPanel
            root={continuationsRoot}
            path={path}
            baseDepth={baseMoves.length}
            onPush={push}
            onPop={pop}
            onReset={resetPath}
            focusedSan={focusedSan}
            onFocus={(san) =>
              setFocusIndex(
                Math.max(
                  0,
                  currentChildren.findIndex((c) => c.san === san),
                ),
              )
            }
            title={selected ? "Continuations" : "First moves"}
          />
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

function EmptyContinuationsPanel({ previewing }: { previewing: boolean }) {
  return (
    <div className="hidden h-full min-h-0 flex-col overflow-hidden rounded-xl border bg-card xl:flex">
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-sm font-medium">Continuations</span>
        <span className="text-xs text-muted-foreground">—</span>
      </div>
      <div className="border-t" />
      <div className="grid flex-1 place-items-center px-6 py-8">
        <div className="flex max-w-[240px] flex-col items-center gap-3 text-center">
          <div className="grid size-10 place-items-center rounded-full border border-dashed text-muted-foreground">
            {previewing ? (
              <Info className="size-4" />
            ) : (
              <GitBranch className="size-4" />
            )}
          </div>
          <div className="text-sm font-medium">
            {previewing
              ? "Previewing a recommended line"
              : "No opening selected"}
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {previewing
              ? "This line isn't in your games yet, so there are no real continuations to show. Close the preview to drill back into your repertoire."
              : "Pick an opening on the left to see the moves you actually played from that position, ranked by frequency and win rate."}
          </p>
          {!previewing ? (
            <div className="flex items-center gap-1.5 rounded-full border bg-background/60 px-2.5 py-1 text-[11px] text-muted-foreground">
              <MousePointerClick className="size-3" />
              Click any row on the left
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function EmptyCenterPanel({
  color,
  boardMoves,
  actions,
}: {
  color: PlayerColor;
  boardMoves: string[];
  actions?: React.ReactNode;
}) {
  const hasMoves = boardMoves.length > 0;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-xs text-muted-foreground">Board</div>
          <div className="mt-0.5 text-sm font-semibold leading-tight text-muted-foreground">
            {hasMoves
              ? "Exploring from the initial position"
              : "Pick an opening or press → to start exploring"}
          </div>
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
      <div className="mx-auto w-full max-w-[min(100%,calc(100dvh-20rem))]">
        <ChessBoard moves={boardMoves} orientation={color} />
      </div>
      <p className="text-center text-[11px] text-muted-foreground">
        Tip · ↑ ↓ pick alternative · → play · ← back
      </p>
    </div>
  );
}

function CenterPanel({
  stats,
  color,
  boardMoves,
  actions,
}: {
  stats: OpeningStats;
  color: PlayerColor;
  boardMoves: string[];
  actions?: React.ReactNode;
}) {
  const winPct = stats.gameCount ? stats.playerWins / stats.gameCount : 0;
  const drawPct = stats.gameCount ? stats.draws / stats.gameCount : 0;
  const lossPct = stats.gameCount ? stats.playerLosses / stats.gameCount : 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
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
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>

      <div className="mx-auto w-full max-w-[min(100%,calc(100dvh-20rem))]">
        <ChessBoard moves={boardMoves} orientation={color} />
      </div>

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

