"use client";

import { ContinuationsTable } from "@/components/chess/continuations-table";
import { Separator } from "@/components/ui/separator";
import type { MoveNode } from "@/lib/repertoire/aggregate";

interface ContinuationsPanelProps {
  root: MoveNode;
  path: string[];
  baseDepth: number;
  onPush: (san: string) => void;
  onPop: () => void;
  onReset: () => void;
}

export function ContinuationsPanel({
  root,
  path,
  baseDepth,
  onPush,
  onPop,
  onReset,
}: ContinuationsPanelProps) {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border bg-card">
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-sm font-medium">Continuations</span>
        <span className="text-xs text-muted-foreground">
          {path.length > 0
            ? `${baseDepth + path.length} ply`
            : `from ${baseDepth} ply`}
        </span>
      </div>
      <Separator />
      <ContinuationsTable
        root={root}
        path={path}
        onPush={onPush}
        onPop={onPop}
        onReset={onReset}
      />
    </div>
  );
}
