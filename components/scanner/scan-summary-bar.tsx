"use client";

import { ChevronDown, Pencil, RotateCcw, UserCircle, X } from "lucide-react";
import { useDictionary } from "@/lib/i18n/context";
import type { RepertoireStats } from "@/lib/repertoire/aggregate";
import type { ScanProgressEvent } from "@/lib/sources/types";
import { useDashboardFilters } from "@/lib/state/dashboard-filters";
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
  const {
    selectedFamily,
    selectedId,
    path,
    previewMoves,
    setSelectedFamily,
    clearOpening,
    clearFamily,
    clearPath,
    clearPreview,
  } = useDashboardFilters();
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
  const timeClassLabelMap: Record<string, string> = {
    bullet: dict.form.timeBullet,
    blitz: dict.form.timeBlitz,
    rapid: dict.form.timeRapid,
    classical: dict.form.timeClassical,
  };
  const localizedTimeClasses = timeClasses
    .map((tc) => timeClassLabelMap[tc] ?? tc)
    .join(", ");

  const selectedStats = selectedId ? stats?.byOpening[selectedId] : null;
  const derivedFamily = selectedStats?.entry?.family ?? null;
  const familyLabel = selectedFamily ?? derivedFamily;
  const variationLabel = selectedStats
    ? stripFamilyPrefix(
        selectedStats.entry?.name ?? dict.dashboard.uncategorized,
        selectedStats.entry?.family,
      )
    : null;
  const hasFilters = Boolean(
    selectedFamily || selectedId || path.length > 0 || previewMoves,
  );
  const handleRemoveFamily = () => clearFamily();
  const handleRemoveVariation = () => {
    if (!selectedFamily && derivedFamily) {
      setSelectedFamily(derivedFamily);
    }
    clearOpening();
  };
  const clearAll = () => {
    if (previewMoves) clearPreview();
    clearFamily();
  };

  return (
    <div className="rounded-xl border border-border bg-paper paper-inset">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-3 sm:px-4">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
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
              {localizedTimeClasses ? ` · ${localizedTimeClasses}` : ""}
              {" · "}
              {windowLabelMap[window] ?? window}
            </div>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
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

      {hasFilters ? (
        <div className="flex flex-wrap items-center gap-1.5 border-t border-border/60 px-3 py-2 sm:px-4">
          <span className="text-[11px] font-medium uppercase tracking-wider text-ink-light">
            {dict.dashboard.filterLabel}
          </span>
          {familyLabel ? (
            <FilterChip label={familyLabel} onRemove={handleRemoveFamily} />
          ) : null}
          {variationLabel ? (
            <FilterChip
              label={variationLabel}
              onRemove={handleRemoveVariation}
            />
          ) : null}
          {path.length > 0 ? (
            <FilterChip
              label={dict.dashboard.filterPlySuffix
                .replace(/^·\s*/, "")
                .replace("{count}", String(path.length))}
              onRemove={clearPath}
              subtle
            />
          ) : null}
          {previewMoves ? (
            <FilterChip
              label={dict.dashboard.previewingLine}
              onRemove={clearPreview}
              subtle
            />
          ) : null}
          <button
            type="button"
            onClick={clearAll}
            className="ml-auto rounded-md px-2 py-0.5 text-[11px] font-medium text-ink-light hover:bg-paper-dark hover:text-foreground transition-colors"
          >
            {dict.dashboard.clearFilter}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function stripFamilyPrefix(name: string, family: string | undefined): string {
  if (!family) return name;
  const colon = name.indexOf(":");
  if (colon < 0) return name;
  return name.slice(colon + 1).trim();
}

function FilterChip({
  label,
  onRemove,
  subtle,
}: {
  label: string;
  onRemove: () => void;
  subtle?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
        subtle
          ? "border-border bg-paper-dark/40 text-ink-light"
          : "border-amber/40 bg-amber/10 text-foreground",
      )}
    >
      <span className="truncate max-w-[10rem] sm:max-w-[16rem]">{label}</span>
      <button
        type="button"
        onClick={onRemove}
        className="-mr-1 rounded-full p-0.5 text-ink-light/70 hover:bg-rose-500/10 hover:text-rose-500 transition-colors"
        aria-label="Remove filter"
      >
        <X className="size-3" />
      </button>
    </span>
  );
}
