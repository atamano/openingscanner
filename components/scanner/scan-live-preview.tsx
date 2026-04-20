"use client";

import { Sparkles } from "lucide-react";
import { useDictionary } from "@/lib/i18n/context";
import type {
  PartialOpeningSnapshot,
  ScanProgressEvent,
} from "@/lib/sources/types";
import { cn, formatNumber } from "@/lib/utils";

interface ScanLivePreviewProps {
  progress: ScanProgressEvent | null;
}

export function ScanLivePreview({ progress }: ScanLivePreviewProps) {
  const dict = useDictionary();
  const top = progress?.topOpenings ?? [];

  return (
    <section className="rounded-xl border border-border bg-paper p-5 paper-inset animate-fade-up">
      <header className="flex items-start gap-3">
        <div className="grid size-9 place-items-center rounded-full border border-amber/30 bg-amber/10 text-amber">
          <Sparkles className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-foreground">
            {dict.livePreview.title}
          </h2>
          <p className="text-xs text-ink-light mt-0.5">
            {dict.livePreview.subtitle}
          </p>
        </div>
      </header>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {top.length === 0
          ? Array.from({ length: 6 }).map((_, i) => (
              <SkeletonRow key={i} index={i} />
            ))
          : top.map((opening, i) => (
              <PreviewRow
                key={opening.id}
                opening={opening}
                rank={i + 1}
              />
            ))}
      </div>
    </section>
  );
}

function PreviewRow({
  opening,
  rank,
}: {
  opening: PartialOpeningSnapshot;
  rank: number;
}) {
  const total = opening.wins + opening.draws + opening.losses || 1;
  const winPct = (opening.wins / total) * 100;
  const drawPct = (opening.draws / total) * 100;
  const lossPct = (opening.losses / total) * 100;

  return (
    <div
      className="group flex items-center gap-3 rounded-lg border border-border/60 bg-background/40 px-3 py-2 animate-fade-up"
      style={{ animationDelay: `${Math.min(rank * 30, 240)}ms` }}
    >
      <span className="font-mono text-[10px] text-ink-light/70 tabular-nums w-4 text-right shrink-0">
        {rank}
      </span>
      <span
        className={cn(
          "size-2 shrink-0 rounded-full ring-2 ring-background",
          opening.color === "white" ? "bg-foreground/80" : "bg-foreground",
        )}
        title={opening.color}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-1.5">
          {opening.eco ? (
            <span className="font-mono text-[10px] text-ink-light/70 tabular-nums shrink-0">
              {opening.eco}
            </span>
          ) : null}
          <span className="truncate text-xs font-medium text-foreground">
            {opening.name}
          </span>
        </div>
        <div className="mt-1 flex h-1 overflow-hidden rounded-full bg-border/40">
          <div
            className="h-full bg-emerald-500/70 transition-all duration-500"
            style={{ width: `${winPct}%` }}
          />
          <div
            className="h-full bg-amber/70 transition-all duration-500"
            style={{ width: `${drawPct}%` }}
          />
          <div
            className="h-full bg-rose-500/70 transition-all duration-500"
            style={{ width: `${lossPct}%` }}
          />
        </div>
      </div>
      <span className="font-mono text-xs tabular-nums text-foreground shrink-0 w-10 text-right">
        {formatNumber(opening.gameCount)}
      </span>
    </div>
  );
}

function SkeletonRow({ index }: { index: number }) {
  const widths = ["60%", "75%", "45%", "70%", "55%", "80%"];
  return (
    <div
      className="flex items-center gap-3 rounded-lg border border-dashed border-border/60 bg-background/20 px-3 py-2"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <span className="size-2 shrink-0 rounded-full bg-border/60 animate-pulse" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <div
          className="h-2 rounded-full bg-border/60 animate-pulse"
          style={{ width: widths[index % widths.length] }}
        />
        <div className="h-1 rounded-full bg-border/40" />
      </div>
      <div className="h-2 w-8 rounded-full bg-border/60 animate-pulse" />
    </div>
  );
}
