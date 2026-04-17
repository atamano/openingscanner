"use client";

import { Progress } from "@/components/ui/progress";
import type { ScanProgressEvent } from "@/lib/sources/types";
import { formatNumber } from "@/lib/utils";

interface ScanProgressProps {
  progress: ScanProgressEvent | null;
  running: boolean;
  expected?: number;
}

export function ScanProgress({ progress, running, expected = 1000 }: ScanProgressProps) {
  if (!progress && !running) return null;
  const fetched = progress?.fetched ?? 0;
  const pct = Math.min((fetched / expected) * 100, 95);

  return (
    <div className="space-y-2 rounded-lg border bg-card p-4">
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-medium">
          {running ? "Streaming games…" : "Complete"}
        </span>
        <span className="font-mono text-xs text-muted-foreground">
          {formatNumber(fetched)} games
          {progress?.currentLabel ? ` · ${progress.currentLabel}` : ""}
        </span>
      </div>
      <Progress value={running ? pct : 100} />
    </div>
  );
}
