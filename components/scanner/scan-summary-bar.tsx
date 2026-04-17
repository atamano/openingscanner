"use client";

import { ChevronDown, Pencil, RotateCcw, User2 } from "lucide-react";
import { cn, formatNumber } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { RepertoireStats } from "@/lib/repertoire/aggregate";
import type { ScanProgressEvent } from "@/lib/sources/types";

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

const COLOR_LABEL: Record<string, string> = {
  white: "as White",
  black: "as Black",
  both: "both sides",
};

const WINDOW_LABEL: Record<string, string> = {
  "30d": "last 30 days",
  "6m": "last 6 months",
  "1y": "last year",
  all: "all time",
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
  const gameCount = stats?.totalGames ?? progress?.fetched ?? 0;

  return (
    <div className="sticky top-14 z-30 -mx-4 border-b bg-background/85 px-4 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <div className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
            <User2 className="size-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 truncate text-sm font-semibold leading-tight">
              <span className="truncate">{username || "—"}</span>
              <Badge variant="outline" className="hidden shrink-0 sm:inline-flex">
                {PLATFORM_LABEL[platform] ?? platform}
              </Badge>
            </div>
            <div className="truncate text-xs text-muted-foreground">
              {COLOR_LABEL[color] ?? color}
              {timeClasses.length
                ? ` · ${timeClasses.join(", ")}`
                : ""}
              {" · "}
              {WINDOW_LABEL[window] ?? window}
            </div>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <div
            className={cn(
              "hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs sm:flex",
              running
                ? "border-primary/30 bg-primary/5 text-primary"
                : "text-muted-foreground",
            )}
          >
            <span
              className={cn(
                "size-1.5 rounded-full",
                running ? "animate-pulse bg-primary" : "bg-muted-foreground/50",
              )}
            />
            <span className="font-mono tabular-nums">
              {formatNumber(gameCount)}
            </span>
            <span>{running ? "streaming" : "games"}</span>
          </div>

          {running ? (
            <Button size="sm" variant="outline" onClick={onAbort}>
              Stop
            </Button>
          ) : null}

          <Button
            size="sm"
            variant={expanded ? "default" : "outline"}
            onClick={onToggle}
          >
            <Pencil className="size-3.5" />
            <span className="hidden sm:inline">
              {expanded ? "Collapse" : "Edit filters"}
            </span>
            <ChevronDown
              className={cn(
                "size-3.5 transition-transform",
                expanded && "rotate-180",
              )}
            />
          </Button>

          <Button size="sm" variant="ghost" onClick={onReset}>
            <RotateCcw className="size-3.5" />
            <span className="hidden sm:inline">New scan</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
