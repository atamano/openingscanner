"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { useDictionary } from "@/lib/i18n/context";
import type { MoveNode } from "@/lib/repertoire/aggregate";
import { cn } from "@/lib/utils";

interface ContinuationsTableProps {
  root: MoveNode;
  path: string[];
  onPush: (san: string) => void;
  onPop: () => void;
  onReset: () => void;
  focusedSan?: string | null;
  onFocus?: (san: string) => void;
}

export function ContinuationsTable({
  root,
  path,
  onPush,
  onPop,
  onReset,
  focusedSan = null,
  onFocus,
}: ContinuationsTableProps) {
  const dict = useDictionary();
  const node = useMemo(() => descend(root, path), [root, path]);

  const children = useMemo(
    () =>
      Object.values(node.children).sort((a, b) => b.count - a.count),
    [node.children],
  );

  const focusedRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    focusedRef.current?.scrollIntoView({ block: "nearest" });
  }, [focusedSan, path]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="grid grid-cols-[auto_minmax(4rem,1fr)_minmax(5rem,56%)] items-center gap-3 border-b px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        <span>{dict.continuations.move}</span>
        <span>{dict.continuations.games}</span>
        <span>{dict.continuations.results}</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {children.length === 0 ? (
          <div className="grid place-items-center px-4 py-12 text-sm text-muted-foreground">
            {path.length > 0
              ? dict.continuations.noFurther
              : dict.continuations.noRecurring}
          </div>
        ) : (
          <ul className="divide-y">
            {children.map((child) => (
              <ContinuationRow
                key={child.san}
                node={child}
                focused={child.san === focusedSan}
                buttonRef={
                  child.san === focusedSan ? focusedRef : undefined
                }
                onClick={() => onPush(child.san)}
                onHover={
                  onFocus ? () => onFocus(child.san) : undefined
                }
              />
            ))}
          </ul>
        )}
      </div>

      <div className="flex items-center gap-1 border-t px-2 py-1.5 text-xs">
        {path.length > 0 ? (
          <>
            <button
              type="button"
              onClick={onPop}
              className="inline-flex items-center gap-1 rounded px-2 py-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <ChevronLeft className="size-3.5" /> {dict.continuations.prev}
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
              {dict.continuations.reset}
            </button>
          </>
        ) : (
          <div className="flex w-full items-center justify-center gap-2 px-2 text-[11px] text-muted-foreground">
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd>
            <span>{dict.continuations.pick}</span>
            <Kbd>→</Kbd>
            <span>{dict.continuations.play}</span>
            <Kbd>←</Kbd>
            <span>{dict.continuations.back}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex min-w-[1.25rem] items-center justify-center rounded border bg-background px-1 py-0.5 font-mono text-[10px] font-semibold leading-none text-foreground">
      {children}
    </kbd>
  );
}

function ContinuationRow({
  node,
  focused,
  buttonRef,
  onClick,
  onHover,
}: {
  node: MoveNode;
  focused: boolean;
  buttonRef?: React.Ref<HTMLButtonElement>;
  onClick: () => void;
  onHover?: () => void;
}) {
  const total = node.count;
  const winPct = total ? node.playerWins / total : 0;
  const drawPct = total ? node.draws / total : 0;
  const lossPct = total ? node.playerLosses / total : 0;

  return (
    <li>
      <button
        type="button"
        ref={buttonRef}
        onClick={onClick}
        onMouseEnter={onHover}
        className={cn(
          "group relative grid w-full grid-cols-[auto_minmax(4rem,1fr)_minmax(5rem,56%)] items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors",
          "hover:bg-accent/40 focus-visible:bg-accent/60 focus-visible:outline-none",
          focused && "bg-primary/10",
        )}
      >
        {focused ? (
          <span className="absolute inset-y-0 left-0 w-0.5 bg-primary" />
        ) : null}
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
