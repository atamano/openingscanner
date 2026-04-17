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
  expected = 2000,
}: ScanProgressProps) {
  const dict = useDictionary();
  if (!progress && !running) return null;
  const fetched = progress?.fetched ?? 0;
  const classified = progress?.classified ?? 0;
  const pct = Math.min((fetched / expected) * 100, 95);

  return (
    <div className="rounded-xl border border-amber/20 bg-amber/5 p-4 animate-fade-up">
      <div className="flex items-center gap-2.5 text-sm">
        {running && (
          <Loader2 className="h-4 w-4 animate-spin text-amber shrink-0" />
        )}
        <span className="text-ink-light">
          {running ? dict.progress.streaming : dict.progress.complete}
        </span>
        <span className="ml-auto font-mono text-xs text-ink-light tabular-nums">
          <span className="text-foreground">{formatNumber(fetched)}</span>{" "}
          {dict.progress.fetched} · {formatNumber(classified)}{" "}
          {dict.progress.classified}
          {progress?.currentLabel ? ` · ${progress.currentLabel}` : ""}
        </span>
      </div>
      <div className="mt-3 h-1.5 rounded-full bg-amber/10 overflow-hidden">
        <div
          className="h-full bg-amber/60 rounded-full transition-all"
          style={{ width: `${running ? pct : 100}%` }}
        />
      </div>
    </div>
  );
}
