"use client";

import { Loader2 } from "lucide-react";
import { useDictionary } from "@/lib/i18n/context";
import type { ScanProgressEvent } from "@/lib/sources/types";
import { formatNumber } from "@/lib/utils";

interface ScanProgressProps {
  progress: ScanProgressEvent | null;
  running: boolean;
  expected?: number;
}

export function ScanProgress({
  progress,
  running,
  expected,
}: ScanProgressProps) {
  const dict = useDictionary();
  if (!progress && !running) return null;
  const fetched = progress?.fetched ?? 0;
  const classified = progress?.classified ?? 0;
  const indeterminate = expected === undefined && running;
  const pct = expected ? Math.min((fetched / expected) * 100, 95) : 100;

  return (
    <div className="sticker rounded-2xl bg-card p-4 animate-fade-up">
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm">
        {running && (
          <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
        )}
        <span className="text-ink-light">
          {running ? dict.progress.streaming : dict.progress.complete}
        </span>
        <span className="ml-auto min-w-0 truncate font-mono text-xs text-ink-light tabular-nums">
          <span className="text-foreground">{formatNumber(fetched)}</span>{" "}
          {dict.progress.fetched} · {formatNumber(classified)}{" "}
          {dict.progress.classified}
          {progress?.currentLabel ? ` · ${progress.currentLabel}` : ""}
        </span>
      </div>
      <div className="mt-3 h-2.5 rounded-full border-2 border-line bg-muted overflow-hidden">
        {indeterminate ? (
          <div className="h-full w-1/3 bg-primary rounded-full animate-progress-indeterminate" />
        ) : (
          <div
            className="h-full bg-primary rounded-full transition-all"
            style={{ width: `${running ? pct : 100}%` }}
          />
        )}
      </div>
    </div>
  );
}
