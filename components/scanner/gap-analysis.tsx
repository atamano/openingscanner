"use client";

import { useEffect, useMemo, useState } from "react";
import { Lightbulb } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { computeGaps } from "@/lib/repertoire/gaps";
import type { RepertoireStats } from "@/lib/repertoire/aggregate";
import type { PlayerColor } from "@/lib/sources/types";

interface GapAnalysisProps {
  stats: RepertoireStats;
  color: PlayerColor;
  onSelect: (moves: string[]) => void;
}

const PAGE_SIZE = 8;

export function GapAnalysis({ stats, color, onSelect }: GapAnalysisProps) {
  const gaps = useMemo(
    () => computeGaps(stats, color, Number.MAX_SAFE_INTEGER),
    [stats, color],
  );

  const [visible, setVisible] = useState(PAGE_SIZE);

  // Reset the pager when the underlying list changes (e.g. switching color).
  useEffect(() => setVisible(PAGE_SIZE), [gaps]);

  if (gaps.length === 0) return null;

  const shown = gaps.slice(0, visible);
  const remaining = gaps.length - shown.length;

  return (
    <Card>
      <CardHeader className="flex-row items-center gap-2 space-y-0">
        <Lightbulb className="size-4 text-primary" />
        <div>
          <CardTitle>Worth exploring</CardTitle>
          <CardDescription>
            Openings missing from the player's {color} repertoire.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {shown.map(({ entry, reason }) => (
          <button
            key={entry.id}
            type="button"
            onClick={() => onSelect(entry.moves)}
            className="group rounded-lg border bg-card p-3 text-left transition-colors hover:border-primary hover:bg-accent/40"
          >
            <div className="mb-2 flex items-center gap-2">
              <Badge variant="outline" className="font-mono">{entry.eco}</Badge>
              <span className="text-xs text-muted-foreground">{entry.family}</span>
            </div>
            <div className="font-medium">{entry.name}</div>
            <div className="mt-1 text-xs text-muted-foreground">{reason}</div>
            <div className="mt-2 font-mono text-xs text-muted-foreground group-hover:text-primary">
              {renderPreview(entry.moves)}
            </div>
          </button>
        ))}
      </CardContent>
      {remaining > 0 ? (
        <div className="flex items-center justify-center gap-2 border-t px-6 py-3 text-xs text-muted-foreground">
          <span>
            Showing {shown.length} of {gaps.length}
          </span>
          <span>·</span>
          <button
            type="button"
            onClick={() =>
              setVisible((v) => Math.min(v + PAGE_SIZE, gaps.length))
            }
            className="font-medium text-primary hover:underline"
          >
            Show {Math.min(PAGE_SIZE, remaining)} more
          </button>
          {visible > PAGE_SIZE ? (
            <>
              <span>·</span>
              <button
                type="button"
                onClick={() => setVisible(PAGE_SIZE)}
                className="font-medium hover:text-foreground hover:underline"
              >
                Collapse
              </button>
            </>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}

function renderPreview(sans: string[]): string {
  const limit = Math.min(sans.length, 8);
  const out: string[] = [];
  for (let i = 0; i < limit; i++) {
    if (i % 2 === 0) out.push(`${i / 2 + 1}.`);
    out.push(sans[i]);
  }
  return out.join(" ") + (sans.length > limit ? " …" : "");
}
