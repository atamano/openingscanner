"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo } from "react";
import type { MoveNode } from "@/lib/repertoire/aggregate";
import { cn } from "@/lib/utils";

interface ContinuationsTableProps {
  root: MoveNode;
  path: string[];
  onPush: (san: string) => void;
  onPop: () => void;
  onReset: () => void;
}

export function ContinuationsTable({
  root,
  path,
  onPush,
  onPop,
  onReset,
}: ContinuationsTableProps) {
  const node = useMemo(() => descend(root, path), [root, path]);

  const children = useMemo(
    () =>
      Object.values(node.children).sort((a, b) => b.count - a.count),
    [node.children],
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="grid grid-cols-[auto_minmax(4rem,1fr)_minmax(5rem,56%)] items-center gap-3 border-b px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        <span>Move</span>
        <span>Games</span>
        <span>Results</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {children.length === 0 ? (
          <div className="grid place-items-center px-4 py-12 text-sm text-muted-foreground">
            {path.length > 0
              ? "No further continuations from this position."
              : "No recurring continuations yet."}
          </div>
        ) : (
          <ul className="divide-y">
            {children.map((child) => (
              <ContinuationRow
                key={child.san}
                node={child}
                onClick={() => onPush(child.san)}
              />
            ))}
          </ul>
        )}
      </div>

      {path.length > 0 ? (
        <div className="flex items-center gap-1 border-t px-2 py-1.5 text-xs">
          <button
            type="button"
            onClick={onPop}
            className="inline-flex items-center gap-1 rounded px-2 py-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <ChevronLeft className="size-3.5" /> Prev
          </button>
          <div className="mx-1 h-4 w-px bg-border" />
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
            {path.map((san, i) => {
              const moveNum = Math.floor(i / 2) + 1;
              const isWhite = i % 2 === 0;
              return (
                <span key={i} className="font-mono text-muted-foreground">
                  {isWhite ? `${moveNum}.` : ""}
                  <span className="text-foreground">{san}</span>
                </span>
              );
            })}
          </div>
          <button
            type="button"
            onClick={onReset}
            className="rounded px-2 py-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            Reset
          </button>
        </div>
      ) : null}
    </div>
  );
}

function ContinuationRow({
  node,
  onClick,
}: {
  node: MoveNode;
  onClick: () => void;
}) {
  const total = node.count;
  const winPct = total ? node.playerWins / total : 0;
  const drawPct = total ? node.draws / total : 0;
  const lossPct = total ? node.playerLosses / total : 0;

  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "group grid w-full grid-cols-[auto_minmax(4rem,1fr)_minmax(5rem,56%)] items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors",
          "hover:bg-accent/40 focus-visible:bg-accent/60 focus-visible:outline-none",
        )}
      >
        <span className="font-mono text-sm font-semibold tabular-nums">
          {node.san}
        </span>
        <span className="font-mono tabular-nums text-muted-foreground">
          {total}
        </span>
        <div className="flex items-center gap-2">
          <ResultsBar
            wins={node.playerWins}
            draws={node.draws}
            losses={node.playerLosses}
            winPct={winPct}
            drawPct={drawPct}
            lossPct={lossPct}
          />
          <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/40 transition-all group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
        </div>
      </button>
    </li>
  );
}

interface ResultsBarProps {
  wins: number;
  draws: number;
  losses: number;
  winPct: number;
  drawPct: number;
  lossPct: number;
}

function ResultsBar({
  wins,
  draws,
  losses,
  winPct,
  drawPct,
  lossPct,
}: ResultsBarProps) {
  return (
    <div
      className="relative flex h-5 w-full overflow-hidden rounded-[3px] border bg-muted/40 text-[11px] font-medium tabular-nums"
      role="img"
      aria-label={`${wins} wins, ${draws} draws, ${losses} losses`}
    >
      <Segment
        pct={winPct}
        label={wins}
        className="bg-foreground/95 text-background"
      />
      <Segment
        pct={drawPct}
        label={draws}
        className="bg-muted-foreground/60 text-background"
      />
      <Segment
        pct={lossPct}
        label={losses}
        className="bg-foreground/20 text-foreground"
      />
    </div>
  );
}

function Segment({
  pct,
  label,
  className,
}: {
  pct: number;
  label: number;
  className: string;
}) {
  if (pct <= 0) return null;
  return (
    <div
      className={cn(
        "flex items-center justify-center overflow-hidden",
        className,
      )}
      style={{ width: `${pct * 100}%` }}
    >
      {pct > 0.08 ? <span>{label}</span> : null}
    </div>
  );
}

function descend(root: MoveNode, path: string[]): MoveNode {
  let node = root;
  for (const san of path) {
    const next = node.children[san];
    if (!next) return emptyNode();
    node = next;
  }
  return node;
}

function emptyNode(): MoveNode {
  return { san: "", count: 0, playerWins: 0, draws: 0, playerLosses: 0, children: {} };
}
