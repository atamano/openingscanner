"use client";

import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { isUncategorizedId } from "@/lib/catalog/openings";
import { useDictionary } from "@/lib/i18n/context";
import type { OpeningStats, RepertoireStats } from "@/lib/repertoire/aggregate";
import type { PlayerColor } from "@/lib/sources/types";
import { useDashboardFilters } from "@/lib/state/dashboard-filters";
import { cn, formatPct } from "@/lib/utils";

interface RepertoireListProps {
  stats: RepertoireStats;
  color: PlayerColor;
  selectedId: string | null;
  onSelect: (id: string) => void;
  headerAction?: React.ReactNode;
}

const OTHER_FAMILY = "Other";

export function RepertoireList({
  stats,
  color,
  selectedId,
  onSelect,
  headerAction,
}: RepertoireListProps) {
  const dict = useDictionary();
  const UNCATEGORIZED_LABEL = dict.dashboard.uncategorized;
  const [query, setQuery] = useState("");
  const { selectedFamily, setSelectedFamily, clearFamily } =
    useDashboardFilters();

  const colorEntries = useMemo(
    () => Object.values(stats.byOpening).filter((s) => s.color === color),
    [stats, color],
  );

  const total = useMemo(
    () => colorEntries.reduce((acc, s) => acc + s.gameCount, 0),
    [colorEntries],
  );

  const groups = useMemo(() => groupByFamily(colorEntries), [colorEntries]);

  const normalized = query.trim().toLowerCase();
  const isSearching = normalized.length > 0;

  const searchHits = useMemo(() => {
    if (!isSearching) return [];
    return colorEntries
      .filter((s) => {
        if (isUncategorizedId(s.openingId)) {
          return UNCATEGORIZED_LABEL.toLowerCase().includes(normalized);
        }
        const e = s.entry;
        if (!e) return false;
        return (
          e.name.toLowerCase().includes(normalized) ||
          e.family.toLowerCase().includes(normalized) ||
          e.eco.toLowerCase().includes(normalized)
        );
      })
      .sort(sortByCount);
  }, [colorEntries, isSearching, normalized]);

  // Keep the list in sync with an externally-updated selection: if the user
  // jumps to a variation in a different family than the one currently drilled,
  // follow it. Don't auto-drill when the user is browsing the root view.
  useEffect(() => {
    if (isSearching) return;
    if (!selectedId) return;
    if (selectedFamily === null) return;
    const s = stats.byOpening[selectedId];
    const fam =
      s && isUncategorizedId(s.openingId)
        ? OTHER_FAMILY
        : s?.entry?.family ?? OTHER_FAMILY;
    if (selectedFamily !== fam) setSelectedFamily(fam);
  }, [selectedId, selectedFamily, isSearching, stats, setSelectedFamily]);

  const drilledGroup = selectedFamily
    ? groups.find((g) => g.family === selectedFamily) ?? null
    : null;

  const showingVariants = !isSearching && drilledGroup !== null;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border bg-card">
      <div className="space-y-2 border-b p-3">
        {showingVariants ? (
          <button
            type="button"
            onClick={clearFamily}
            className="flex w-full items-center gap-1.5 rounded-md px-1 py-0.5 text-left text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronLeft className="size-3.5" />
            <span className="truncate">{dict.dashboard.allOpenings}</span>
            <span className="ml-auto text-xs">
              {drilledGroup?.entries.length}{" "}
              {drilledGroup && drilledGroup.entries.length > 1
                ? dict.dashboard.variantsMany
                : dict.dashboard.variantsOne}
            </span>
          </button>
        ) : (
          <div className="flex items-center gap-2 px-1">
            <span className="text-sm font-medium">{dict.dashboard.openings}</span>
            <span className="text-xs text-muted-foreground">
              {isSearching ? searchHits.length : groups.length}{" "}
              {isSearching ? dict.dashboard.hits : dict.dashboard.families}
            </span>
            {headerAction ? (
              <span className="ml-auto">{headerAction}</span>
            ) : null}
          </div>
        )}
        {showingVariants ? (
          <div className="truncate px-1 text-sm font-semibold tracking-tight">
            {drilledGroup?.family}
          </div>
        ) : (
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              placeholder={dict.dashboard.searchPlaceholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-8 w-full rounded-md border border-input bg-background pl-8 pr-7 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-1 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                aria-label={dict.dashboard.clearSearch}
              >
                <X className="size-3.5" />
              </button>
            ) : null}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {isSearching ? (
          searchHits.length === 0 ? (
            <Empty
              label={dict.dashboard.noMatch.replace("{query}", query)}
            />
          ) : (
            <ul className="divide-y">
              {searchHits.map((s) => (
                <li key={s.openingId}>
                  <OpeningRow
                    stats={s}
                    total={total}
                    selected={selectedId === s.openingId}
                    onSelect={() => onSelect(s.openingId)}
                    uncategorized={isUncategorizedId(s.openingId)}
                    showFamily
                  />
                </li>
              ))}
            </ul>
          )
        ) : showingVariants && drilledGroup ? (
          <ul className="divide-y">
            {drilledGroup.entries.map((s) => (
              <li key={s.openingId}>
                <OpeningRow
                  stats={s}
                  total={total}
                  selected={selectedId === s.openingId}
                  onSelect={() => onSelect(s.openingId)}
                  uncategorized={isUncategorizedId(s.openingId)}
                />
              </li>
            ))}
          </ul>
        ) : groups.length === 0 ? (
          <Empty label={dict.dashboard.noDataYet} />
        ) : (
          <ul className="divide-y">
            {groups.map((group) => (
              <li key={group.family}>
                {group.entries.length === 1 ? (
                  <OpeningRow
                    stats={group.entries[0]}
                    total={total}
                    selected={selectedId === group.entries[0].openingId}
                    onSelect={() => onSelect(group.entries[0].openingId)}
                    uncategorized={isUncategorizedId(
                      group.entries[0].openingId,
                    )}
                  />
                ) : (
                  <FamilyRow
                    group={group}
                    total={total}
                    containsSelection={group.entries.some(
                      (s) => s.openingId === selectedId,
                    )}
                    onOpen={() => setSelectedFamily(group.family)}
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

interface FamilyGroup {
  family: string;
  entries: OpeningStats[];
  totalGames: number;
}

function groupByFamily(entries: OpeningStats[]): FamilyGroup[] {
  const map = new Map<string, OpeningStats[]>();
  for (const s of entries) {
    const key = isUncategorizedId(s.openingId)
      ? OTHER_FAMILY
      : s.entry?.family ?? OTHER_FAMILY;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(s);
  }
  const out: FamilyGroup[] = [];
  for (const [family, list] of map) {
    out.push({
      family,
      entries: list.sort(sortByCount),
      totalGames: list.reduce((acc, s) => acc + s.gameCount, 0),
    });
  }
  out.sort((a, b) => {
    if (a.family === OTHER_FAMILY) return 1;
    if (b.family === OTHER_FAMILY) return -1;
    return b.totalGames - a.totalGames;
  });
  return out;
}

function sortByCount(a: OpeningStats, b: OpeningStats): number {
  if (isUncategorizedId(a.openingId)) return 1;
  if (isUncategorizedId(b.openingId)) return -1;
  return b.gameCount - a.gameCount;
}

function FamilyRow({
  group,
  total,
  containsSelection,
  onOpen,
}: {
  group: FamilyGroup;
  total: number;
  containsSelection: boolean;
  onOpen: () => void;
}) {
  const pct = total ? group.totalGames / total : 0;
  const wins = group.entries.reduce((a, s) => a + s.playerWins, 0);
  const draws = group.entries.reduce((a, s) => a + s.draws, 0);
  const losses = group.entries.reduce((a, s) => a + s.playerLosses, 0);
  const winPct = group.totalGames ? wins / group.totalGames : 0;
  const drawPct = group.totalGames ? draws / group.totalGames : 0;
  const lossPct = group.totalGames ? losses / group.totalGames : 0;

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "grid w-full grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-2 px-3 py-2.5 text-left transition-colors",
        containsSelection ? "bg-primary/5" : "hover:bg-accent/40",
      )}
    >
      <span className="inline-flex h-6 min-w-[2.25rem] items-center justify-center rounded border border-dashed px-1.5 font-mono text-[10px] text-muted-foreground/80">
        {group.entries.length}
      </span>
      <div className="min-w-0">
        <div className="truncate text-sm font-medium leading-tight">
          {group.family}
        </div>
        <MiniResultsBar
          winPct={winPct}
          drawPct={drawPct}
          lossPct={lossPct}
        />
      </div>
      <div className="flex flex-col items-end gap-0.5 text-right">
        <span className="font-mono text-sm font-semibold tabular-nums leading-tight">
          {group.totalGames}
        </span>
        <span className="text-[10px] text-muted-foreground">
          {formatPct(pct, 0)}
        </span>
      </div>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground/50" />
    </button>
  );
}

function OpeningRow({
  stats,
  total,
  selected,
  onSelect,
  uncategorized,
  showFamily,
}: {
  stats: OpeningStats;
  total: number;
  selected: boolean;
  onSelect: () => void;
  uncategorized?: boolean;
  showFamily?: boolean;
}) {
  const dict = useDictionary();
  const pct = total ? stats.gameCount / total : 0;
  const winPct = stats.gameCount ? stats.playerWins / stats.gameCount : 0;
  const drawPct = stats.gameCount ? stats.draws / stats.gameCount : 0;
  const lossPct = stats.gameCount ? stats.playerLosses / stats.gameCount : 0;
  const label = uncategorized
    ? dict.dashboard.uncategorized
    : stats.entry?.name ?? stats.openingId;
  const eco = !uncategorized ? stats.entry?.eco : null;
  const family = !uncategorized && showFamily ? stats.entry?.family : null;
  const displayName = stripFamilyPrefix(label, stats.entry?.family);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "relative grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-3 py-2 text-left transition-colors",
        selected ? "bg-primary/10" : "hover:bg-accent/40",
      )}
    >
      {selected ? (
        <span className="absolute inset-y-0 left-0 w-0.5 bg-primary" />
      ) : null}

      {eco ? (
        <span className="inline-flex h-6 min-w-[2.25rem] items-center justify-center rounded border px-1.5 font-mono text-[10px] font-semibold tracking-wide text-muted-foreground">
          {eco}
        </span>
      ) : (
        <span className="inline-flex h-6 min-w-[2.25rem] items-center justify-center rounded border border-dashed px-1.5 font-mono text-[10px] text-muted-foreground/60">
          —
        </span>
      )}

      <div className="min-w-0">
        <div className="truncate text-sm font-medium leading-tight">
          {displayName}
        </div>
        {family ? (
          <div className="truncate text-[11px] text-muted-foreground">
            {family}
          </div>
        ) : null}
        <MiniResultsBar winPct={winPct} drawPct={drawPct} lossPct={lossPct} />
      </div>

      <div className="flex flex-col items-end gap-0.5 text-right">
        <span className="font-mono text-sm font-semibold tabular-nums leading-tight">
          {stats.gameCount}
        </span>
        <span className="text-[10px] text-muted-foreground">
          {formatPct(pct, 0)}
        </span>
        <span className="font-mono text-[10px] text-muted-foreground tabular-nums">
          {formatPct(winPct, 0)}
        </span>
      </div>
    </button>
  );
}

function stripFamilyPrefix(
  name: string,
  family: string | undefined,
): string {
  // Lichess opening names are like "Sicilian Defense: Najdorf Variation".
  // In the variants view we already show the family name in the breadcrumb,
  // so trim the redundant prefix.
  if (!family) return name;
  const colon = name.indexOf(":");
  if (colon < 0) return name;
  return name.slice(colon + 1).trim();
}

function MiniResultsBar({
  winPct,
  drawPct,
  lossPct,
}: {
  winPct: number;
  drawPct: number;
  lossPct: number;
}) {
  return (
    <div className="mt-1.5 flex h-1 w-full overflow-hidden rounded-full bg-muted/50">
      <span
        className="bg-emerald-500/85"
        style={{ width: `${winPct * 100}%` }}
      />
      <span
        className="bg-amber-400/70"
        style={{ width: `${drawPct * 100}%` }}
      />
      <span
        className="bg-rose-500/70"
        style={{ width: `${lossPct * 100}%` }}
      />
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return (
    <div className="grid h-full place-items-center px-4 py-12 text-center text-sm text-muted-foreground">
      {label}
    </div>
  );
}
