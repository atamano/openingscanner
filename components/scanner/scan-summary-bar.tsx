"use client";

import { ChevronDown, Pencil, RotateCcw, UserCircle, X } from "lucide-react";
import { useDictionary } from "@/lib/i18n/context";
import type { RepertoireStats } from "@/lib/repertoire/aggregate";
import type { ScanProgressEvent, ScanSource } from "@/lib/sources/types";
import { useDashboardFilters } from "@/lib/state/dashboard-filters";
import { cn, formatNumber } from "@/lib/utils";

interface ScanSummaryBarProps {
  running: boolean;
  progress: ScanProgressEvent | null;
  stats: RepertoireStats | null;
  sources: ScanSource[];
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
  sources,
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
    correspondence: dict.form.timeCorrespondence,
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
    <div className="sticker rounded-2xl bg-card">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-3 sm:px-4">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <div className="sticker-sm grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-pop-sky text-on-pop">
            <UserCircle className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-semibold leading-tight">
              {sources.length === 0 ? (
                <span className="truncate font-mono">—</span>
              ) : (
                sources.map((src, i) => (
                  <span
                    key={`${src.platform}:${src.username}`}
                    className="inline-flex items-center gap-1.5"
                  >
                    {i > 0 ? (
                      <span className="text-ink-light">+</span>
                    ) : null}
                    <span className="truncate font-mono">{src.username}</span>
                    <span className="hidden sm:inline-flex shrink-0 rounded-full border border-border px-2 py-0.5 text-[11px] font-semibold text-ink-light">
                      {PLATFORM_LABEL[src.platform] ?? src.platform}
                    </span>
                  </span>
                ))
              )}
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
                ? "border-line bg-pop-yellow text-on-pop"
                : "border-border text-ink-light",
            )}
          >
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                running ? "animate-warm-pulse bg-on-pop" : "bg-ink-light/40",
              )}
            />
            <span className="font-bold tabular-nums">
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
              className="sticker-sm sticker-press h-9 px-3 rounded-xl bg-destructive text-destructive-foreground text-xs font-bold"
            >
              {dict.summary.stop}
            </button>
          ) : null}

          <button
            type="button"
            onClick={onToggle}
            className={cn(
              "sticker-sm sticker-press flex items-center gap-1.5 h-9 px-3 rounded-xl text-xs font-bold",
              expanded
                ? "bg-pop-yellow text-on-pop"
                : "bg-card text-foreground",
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
            className="sticker-sm sticker-press flex items-center gap-1.5 h-9 px-3 rounded-xl bg-primary text-xs font-bold text-primary-foreground"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{dict.summary.newScan}</span>
          </button>
        </div>
      </div>

      {hasFilters ? (
        <div className="flex flex-wrap items-center gap-1.5 border-t border-border/60 px-3 py-2 sm:px-4">
          <span className="text-xs font-bold text-ink-light">
            {dict.dashboard.filterLabel}
          </span>
          {familyLabel ? (
            <FilterChip label={familyLabel} onRemove={handleRemoveFamily} />
          ) : null}
          {variationLabel && variationLabel !== familyLabel ? (
            <FilterChip
              label={variationLabel}
              onRemove={handleRemoveVariation}
            />
          ) : null}
          {path.length > 0 ? (
            <FilterChip
              label={dict.dashboard.filterPlyChipLabel.replace(
                "{count}",
                String(path.length),
              )}
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
          : "border-line bg-pop-yellow text-on-pop",
      )}
    >
      <span className="truncate max-w-[10rem] sm:max-w-[16rem]">{label}</span>
      <button
        type="button"
        onClick={onRemove}
        className={cn(
          "-mr-1 rounded-full p-0.5 transition-colors",
          subtle
            ? "text-ink-light hover:bg-loss/10 hover:text-loss"
            : "text-on-pop hover:bg-on-pop/15",
        )}
        aria-label="Remove filter"
      >
        <X className="size-3" />
      </button>
    </span>
  );
}
