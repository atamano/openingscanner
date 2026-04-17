"use client";

import { ContinuationsTable } from "@/components/chess/continuations-table";
import { Separator } from "@/components/ui/separator";
import { useDictionary } from "@/lib/i18n/context";
import type { MoveNode } from "@/lib/repertoire/aggregate";

interface ContinuationsPanelProps {
  root: MoveNode;
  path: string[];
  baseDepth: number;
  onPush: (san: string) => void;
  onPop: () => void;
  onReset: () => void;
  focusedSan?: string | null;
  onFocus?: (san: string) => void;
  title?: string;
}

export function ContinuationsPanel({
  root,
  path,
  baseDepth,
  onPush,
  onPop,
  onReset,
  focusedSan,
  onFocus,
  title,
}: ContinuationsPanelProps) {
  const dict = useDictionary();
  const totalPly = baseDepth + path.length;
  const heading = title ?? dict.continuations.move;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border bg-card">
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-sm font-medium">{heading}</span>
        <span className="text-xs text-muted-foreground">
          {totalPly === 0
            ? dict.continuations.start
            : path.length > 0
              ? `${totalPly} ${dict.continuations.plySuffix}`
              : `${dict.continuations.fromPlyPrefix} ${baseDepth} ${dict.continuations.plySuffix}`}
        </span>
      </div>
      <Separator />
      <ContinuationsTable
        root={root}
        path={path}
        onPush={onPush}
        onPop={onPop}
        onReset={onReset}
        focusedSan={focusedSan ?? null}
        onFocus={onFocus}
      />
    </div>
  );
}
