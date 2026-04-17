"use client";

import { ChevronLeft, ChevronRight, Search, Users, X } from "lucide-react";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  POPULAR_PLAYERS,
  playerCountries,
  type PopularPlayer,
} from "@/lib/landing/players";
import type { Platform } from "@/lib/sources/types";

interface PlayerDirectoryProps {
  onPick: (username: string, platform: Platform) => void;
}

const PAGE_SIZE = 12;

const PLATFORMS: { value: Platform; label: string; icon: string }[] = [
  { value: "lichess", label: "Lichess", icon: "♞" },
  { value: "chesscom", label: "Chess.com", icon: "♘" },
];

const COUNTRY_LABELS: Record<string, string> = {
  NO: "Norway",
  US: "USA",
  IN: "India",
  RU: "Russia",
  FR: "France",
  NL: "Netherlands",
  CN: "China",
  DE: "Germany",
  PL: "Poland",
  UZ: "Uzbekistan",
  HU: "Hungary",
  AZ: "Azerbaijan",
  UA: "Ukraine",
  AM: "Armenia",
  GE: "Georgia",
  SE: "Sweden",
  IR: "Iran",
  BY: "Belarus",
  CZ: "Czechia",
  SK: "Slovakia",
  GB: "UK",
  ES: "Spain",
  BR: "Brazil",
  AR: "Argentina",
  PE: "Peru",
  CA: "Canada",
  IL: "Israel",
  CH: "Switzerland",
  VN: "Vietnam",
  TR: "Türkiye",
  RO: "Romania",
  HR: "Croatia",
  RS: "Serbia",
  SRB: "Serbia",
  AE: "UAE",
  EG: "Egypt",
  AT: "Austria",
  BE: "Belgium",
  BG: "Bulgaria",
  GR: "Greece",
  CR: "Costa Rica",
  JM: "Jamaica",
  MK: "North Macedonia",
  LV: "Latvia",
  DK: "Denmark",
  KZ: "Kazakhstan",
  DZ: "Algeria",
};

export function PlayerDirectory({ onPick }: PlayerDirectoryProps) {
  const [platform, setPlatform] = useState<Platform>("chesscom");
  const [country, setCountry] = useState<string>("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);

  const deferredQuery = useDeferredValue(query);
  const normalizedQuery = deferredQuery.trim().toLowerCase();

  const filtered = useMemo(() => {
    return POPULAR_PLAYERS.filter((p) => {
      if (!handleFor(p, platform)) return false;
      if (country && p.country !== country) return false;
      if (!normalizedQuery) return true;
      const handle = handleFor(p, platform) ?? "";
      return (
        p.name.toLowerCase().includes(normalizedQuery) ||
        handle.toLowerCase().includes(normalizedQuery) ||
        (COUNTRY_LABELS[p.country] ?? "")
          .toLowerCase()
          .includes(normalizedQuery)
      );
    });
  }, [platform, country, normalizedQuery]);

  // Reset pagination when any filter changes.
  useEffect(() => {
    setPage(0);
  }, [platform, country, normalizedQuery]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const start = safePage * PAGE_SIZE;
  const shown = filtered.slice(start, start + PAGE_SIZE);

  const countries = useMemo(() => {
    const codes = playerCountries().filter((c) =>
      POPULAR_PLAYERS.some((p) => p.country === c && handleFor(p, platform)),
    );
    return codes.sort((a, b) =>
      (COUNTRY_LABELS[a] ?? a).localeCompare(COUNTRY_LABELS[b] ?? b),
    );
  }, [platform]);

  return (
    <div className="flex h-full min-h-0 flex-col rounded-xl border border-border bg-paper p-4 paper-inset">
      <div className="mb-3 flex items-center gap-2">
        <div className="grid size-7 place-items-center rounded-full bg-amber/10 text-amber-dark">
          <Users className="size-3.5" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-semibold">Popular players</div>
          <div className="text-[11px] text-ink-light">
            {filtered.length} handles · click to scan
          </div>
        </div>
      </div>

      {/* Platform tabs */}
      <div className="mb-3 grid grid-cols-2 gap-1.5">
        {PLATFORMS.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => setPlatform(p.value)}
            className={`h-8 rounded-md text-xs font-medium transition-all border ${
              platform === p.value
                ? "border-amber/40 text-amber-dark"
                : "border-border text-ink-light hover:border-amber/30 hover:text-foreground"
            }`}
            style={
              platform === p.value
                ? { backgroundColor: "rgba(176,122,46,0.12)" }
                : undefined
            }
          >
            <span className="mr-1">{p.icon}</span>
            {p.label}
          </button>
        ))}
      </div>

      {/* Search + country row */}
      <div className="mb-3 flex items-center gap-1.5">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-ink-light/50" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name or handle"
            className="h-8 w-full rounded-md border border-border bg-paper-dark pl-8 pr-7 text-xs placeholder:text-ink-light/40 focus:border-amber focus:ring-2 focus:ring-amber/20 outline-none"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-1 top-1/2 -translate-y-1/2 rounded p-1 text-ink-light hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="size-3" />
            </button>
          ) : null}
        </div>
        <select
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          className="h-8 rounded-md border border-border bg-paper-dark px-2 text-xs text-ink-light focus:border-amber focus:ring-2 focus:ring-amber/20 outline-none"
        >
          <option value="">All countries</option>
          {countries.map((c) => (
            <option key={c} value={c}>
              {COUNTRY_LABELS[c] ?? c}
            </option>
          ))}
        </select>
      </div>

      {/* Cards grid */}
      <div className="flex-1 overflow-y-auto">
        {shown.length === 0 ? (
          <div className="grid h-full place-items-center p-6 text-center text-xs text-ink-light">
            No player matches these filters.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            {shown.map((player) => {
              const handle = handleFor(player, platform);
              if (!handle) return null;
              return (
                <button
                  key={`${player.name}-${platform}-${handle}`}
                  type="button"
                  onClick={() => onPick(handle, platform)}
                  className="group flex flex-col items-start gap-1 rounded-lg border border-border bg-paper-dark p-2 text-left transition-all hover:border-amber/40 hover:bg-amber/5"
                  title={`${player.name} · ${handle}`}
                >
                  <div className="flex w-full items-center gap-1.5">
                    {player.title ? (
                      <span className="rounded border border-border px-1 font-mono text-[9px] font-semibold uppercase tracking-wide text-amber-dark">
                        {player.title}
                      </span>
                    ) : null}
                    <span className="ml-auto font-mono text-[9px] uppercase tracking-wider text-ink-light">
                      {COUNTRY_LABELS[player.country] ?? player.country}
                    </span>
                  </div>
                  <div className="line-clamp-2 text-xs font-semibold leading-tight">
                    {player.name}
                  </div>
                  <div className="truncate font-mono text-[10px] text-ink-light group-hover:text-foreground">
                    {handle}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className="mt-3 flex items-center justify-between border-t border-border pt-2 text-[11px] text-ink-light">
        <span>
          Page {safePage + 1} / {totalPages}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={safePage === 0}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-border hover:border-amber/40 hover:text-foreground disabled:opacity-30"
            aria-label="Previous page"
          >
            <ChevronLeft className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={safePage >= totalPages - 1}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-border hover:border-amber/40 hover:text-foreground disabled:opacity-30"
            aria-label="Next page"
          >
            <ChevronRight className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function handleFor(
  player: PopularPlayer,
  platform: Platform,
): string | undefined {
  return platform === "lichess" ? player.lichess : player.chesscom;
}
