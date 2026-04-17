"use client";

import { ChevronDown, Pencil, RotateCcw, UserCircle } from "lucide-react";
import { useDictionary } from "@/lib/i18n/context";
import type { RepertoireStats } from "@/lib/repertoire/aggregate";
import type { ScanProgressEvent } from "@/lib/sources/types";
import { cn, formatNumber } from "@/lib/utils";

interface ScanSummaryBarProps {
  running: boolean;
  progress: ScanProgressEvent | null;
  stats: RepertoireStats | null;
  username: string;
  platform: string;
  color: string;
  timeClasses: string[];
  window: string;
  expanded: boolean;
  onToggle: () => void;
  onReset: () => void;
  onAbort: () => void;
}

const PLATFORM_LABEL: Record<string, string> = {
  lichess: "Lichess",
  chesscom: "Chess.com",
};

export function ScanSummaryBar({
  running,
  progress,
  stats,
  username,
  platform,
  color,
  timeClasses,
  window,
  expanded,
  onToggle,
  onReset,
  onAbort,
}: ScanSummaryBarProps) {
  const dict = useDictionary();
  const gameCount = stats?.totalGames ?? progress?.fetched ?? 0;

  const colorLabelMap: Record<string, string> = {
    white: dict.summary.asWhite,
    black: dict.summary.asBlack,
    both: dict.summary.bothSides,
  };
  const windowLabelMap: Record<string, string> = {
    "30d": dict.summary.windowLast30d,
    "6m": dict.summary.windowLast6m,
    "1y": dict.summary.windowLast1y,
    all: dict.summary.windowAllTime,
  };

  return (
    <div className="rounded-xl border border-border bg-paper paper-inset">
      <div className="flex flex-wrap items-center gap-3 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-amber/10 text-amber-dark">
            <UserCircle className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 truncate text-sm font-semibold leading-tight">
              <span className="truncate font-mono">{username || "—"}</span>
              <span className="hidden sm:inline-flex shrink-0 rounded-full border border-border px-2 py-0.5 text-[10px] font-medium uppercase tracking-widest text-ink-light">
                {PLATFORM_LABEL[platform] ?? platform}
              </span>
            </div>
            <div className="truncate text-xs text-ink-light">
              {colorLabelMap[color] ?? color}
              {timeClasses.length ? ` · ${timeClasses.join(", ")}` : ""}
              {" · "}
              {windowLabelMap[window] ?? window}
            </div>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <div
            className={cn(
              "hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs sm:flex",
              running
                ? "border-amber/40 bg-amber/10 text-amber-dark"
                : "border-border text-ink-light",
            )}
          >
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                running ? "animate-warm-pulse bg-amber" : "bg-ink-light/40",
              )}
            />
            <span className="font-mono tabular-nums text-foreground">
              {formatNumber(gameCount)}
            </span>
            <span>
              {running ? dict.summary.streamingLabel : dict.summary.gamesLabel}
            </span>
          </div>

          {running ? (
            <button
              type="button"
              onClick={onAbort}
              className="h-8 px-3 rounded-md bg-destructive text-destructive-foreground text-xs font-semibold hover:bg-destructive/90 transition-colors"
            >
              {dict.summary.stop}
            </button>
          ) : null}

          <button
            type="button"
            onClick={onToggle}
            className={cn(
              "flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-medium transition-all border",
              expanded
                ? "border-amber/40 bg-amber/10 text-amber-dark"
                : "border-border text-ink-light hover:border-amber/30 hover:text-foreground",
            )}
          >
            <Pencil className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">
              {expanded ? dict.summary.collapse : dict.summary.editFilters}
            </span>
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 transition-transform",
                expanded && "rotate-180",
              )}
            />
          </button>

          <button
            type="button"
            onClick={onReset}
            className="flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-medium text-ink-light hover:text-foreground hover:bg-paper-dark transition-all"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{dict.summary.newScan}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
