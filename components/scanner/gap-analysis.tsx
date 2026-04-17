"use client";

import { useEffect, useMemo, useState } from "react";
import { Lightbulb } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useDictionary } from "@/lib/i18n/context";
import { computeGaps } from "@/lib/repertoire/gaps";
import type { RepertoireStats } from "@/lib/repertoire/aggregate";
import type { PlayerColor } from "@/lib/sources/types";

interface GapAnalysisProps {
  stats: RepertoireStats;
  color: PlayerColor;
  onSelect: (moves: string[]) => void;
  scopePrefix?: readonly string[];
  scopeLabel?: string | null;
}

const PAGE_SIZE = 8;

export function GapAnalysis({
  stats,
  color,
  onSelect,
  scopePrefix,
  scopeLabel,
}: GapAnalysisProps) {
  const dict = useDictionary();
  const gaps = useMemo(
    () =>
      computeGaps(stats, color, Number.MAX_SAFE_INTEGER, {
        scopePrefix,
      }),
    [stats, color, scopePrefix],
  );

  const [visible, setVisible] = useState(PAGE_SIZE);
  useEffect(() => setVisible(PAGE_SIZE), [gaps]);

  if (gaps.length === 0) return null;

  const shown = gaps.slice(0, visible);
  const remaining = gaps.length - shown.length;
  const scoped = Boolean(scopePrefix && scopePrefix.length > 0);
  const colorLabel = color === "white" ? dict.form.colorWhite : dict.form.colorBlack;

  return (
    <Card>
      <CardHeader className="flex-row items-center gap-2 space-y-0">
        <Lightbulb className="size-4 text-primary" />
        <div>
          <CardTitle>
            {scoped ? dict.gaps.titleScoped : dict.gaps.titleGlobal}
          </CardTitle>
          <CardDescription>
            {scoped && scopeLabel
              ? dict.gaps.descScoped.replace("{opening}", scopeLabel)
              : dict.gaps.descGlobal.replace("{color}", colorLabel.toLowerCase())}
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
            <div className="mt-1 text-xs text-muted-foreground">
              {translateReason(reason, dict)}
            </div>
            <div className="mt-2 font-mono text-xs text-muted-foreground group-hover:text-primary">
              {renderPreview(entry.moves)}
            </div>
          </button>
        ))}
      </CardContent>
      {remaining > 0 ? (
        <div className="flex items-center justify-center gap-2 border-t px-6 py-3 text-xs text-muted-foreground">
          <span>
            {dict.gaps.showingOf
              .replace("{shown}", String(shown.length))
              .replace("{total}", String(gaps.length))}
          </span>
          <span>·</span>
          <button
            type="button"
            onClick={() =>
              setVisible((v) => Math.min(v + PAGE_SIZE, gaps.length))
            }
            className="font-medium text-primary hover:underline"
          >
            {dict.gaps.showMore.replace(
              "{count}",
              String(Math.min(PAGE_SIZE, remaining)),
            )}
          </button>
          {visible > PAGE_SIZE ? (
            <>
              <span>·</span>
              <button
                type="button"
                onClick={() => setVisible(PAGE_SIZE)}
                className="font-medium hover:text-foreground hover:underline"
              >
                {dict.gaps.collapse}
              </button>
            </>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}

// The underlying `computeGaps` returns English reason strings. Map them back
// to localized ones while preserving the count/family interpolation.
function translateReason(
  reason: string,
  dict: ReturnType<typeof useDictionary>,
): string {
  const playedMatch = reason.match(/^You've played this (\d+) times?$/);
  if (playedMatch) {
    const n = Number.parseInt(playedMatch[1], 10);
    const template =
      n > 1 ? dict.gaps.reasonPlayedPlural : dict.gaps.reasonPlayed;
    return template.replace("{count}", String(n));
  }
  const rareMatch = reason.match(/^You rarely explore (.+)$/);
  if (rareMatch) {
    return dict.gaps.reasonRare.replace("{family}", rareMatch[1]);
  }
  return reason;
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
