"use client";

import { ChevronLeft, ChevronRight, Search, Users, X } from "lucide-react";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  POPULAR_PLAYERS,
  playerCountries,
  type PopularPlayer,
} from "@/lib/landing/players";
import { useDictionary } from "@/lib/i18n/context";
import type { Platform } from "@/lib/sources/types";

interface PlayerDirectoryProps {
  platform: Platform;
  onPick: (username: string, platform: Platform) => void;
}

const PAGE_SIZE = 12;

const PLATFORM_LABEL: Record<Platform, string> = {
  chesscom: "Chess.com",
  lichess: "Lichess",
};

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

export function PlayerDirectory({ platform, onPick }: PlayerDirectoryProps) {
  const dict = useDictionary();
  const [country, setCountry] = useState<string>("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);

  const deferredQuery = useDeferredValue(query);
  const normalizedQuery = deferredQuery.trim().toLowerCase();

  const filtered = useMemo(() => {
    const base = POPULAR_PLAYERS.filter((p) => {
      if (!handleFor(p, platform)) return false;
      if (country && p.country !== country) return false;
      return true;
    });

    if (!normalizedQuery) return base;

    // Fuzzy match against name / handle / country — case-insensitive,
    // subsequence-aware (e.g. "mgns" matches "Magnus"), with a score that
    // rewards consecutive matches and matches at word boundaries.
    const scored: { player: (typeof base)[number]; score: number }[] = [];
    for (const p of base) {
      const handle = handleFor(p, platform) ?? "";
      const countryLabel = COUNTRY_LABELS[p.country] ?? p.country;
      const scores = [
        fuzzyScore(normalizedQuery, p.name.toLowerCase()),
        fuzzyScore(normalizedQuery, handle.toLowerCase()),
        fuzzyScore(normalizedQuery, countryLabel.toLowerCase()),
      ];
      const best = Math.max(...scores);
      if (best > 0) scored.push({ player: p, score: best });
    }
    scored.sort((a, b) => b.score - a.score);
    return scored.map((s) => s.player);
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
          <div className="text-sm font-semibold">
            {dict.playerDirectory.popularOn.replace(
              "{platform}",
              PLATFORM_LABEL[platform],
            )}
          </div>
          <div className="text-[11px] text-ink-light">
            {dict.playerDirectory.handlesHint.replace(
              "{count}",
              String(filtered.length),
            )}
          </div>
        </div>
      </div>

      {/* Search + country row */}
      <div className="mb-3 flex items-center gap-1.5">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-ink-light/50" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={dict.playerDirectory.searchPlaceholder}
            className="h-8 w-full rounded-md border border-border bg-paper-dark pl-8 pr-7 text-xs placeholder:text-ink-light/40 focus:border-amber focus:ring-2 focus:ring-amber/20 outline-none"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-1 top-1/2 -translate-y-1/2 rounded p-1 text-ink-light hover:text-foreground"
              aria-label={dict.playerDirectory.clearSearch}
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
          <option value="">{dict.playerDirectory.allCountries}</option>
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
            {dict.playerDirectory.noMatch}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
            {shown.map((player) => {
              const handle = handleFor(player, platform);
              if (!handle) return null;
              return (
                <button
                  key={`${platform}-${handle}`}
                  type="button"
                  onClick={() => onPick(handle, platform)}
                  className="group flex min-w-0 flex-col items-start gap-1 rounded-lg border border-border bg-paper-dark p-2 text-left transition-all hover:border-amber/40 hover:bg-amber/5"
                  title={`${player.name} · ${handle}`}
                >
                  <div className="flex w-full min-w-0 items-center gap-1.5">
                    {player.title ? (
                      <span className="shrink-0 rounded border border-border px-1 font-mono text-[9px] font-semibold uppercase tracking-wide text-amber-dark">
                        {player.title}
                      </span>
                    ) : null}
                    <span
                      className="ml-auto shrink-0 font-mono text-[9px] uppercase tracking-wider text-ink-light"
                      title={COUNTRY_LABELS[player.country] ?? player.country}
                    >
                      {player.country}
                    </span>
                  </div>
                  <div className="line-clamp-2 w-full break-words text-xs font-semibold leading-tight">
                    {player.name}
                  </div>
                  <div className="w-full truncate font-mono text-[10px] text-ink-light group-hover:text-foreground">
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
          {dict.playerDirectory.page
            .replace("{current}", String(safePage + 1))
            .replace("{total}", String(totalPages))}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={safePage === 0}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-border hover:border-amber/40 hover:text-foreground disabled:opacity-30"
            aria-label={dict.playerDirectory.prevPage}
          >
            <ChevronLeft className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={safePage >= totalPages - 1}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-border hover:border-amber/40 hover:text-foreground disabled:opacity-30"
            aria-label={dict.playerDirectory.nextPage}
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

/**
 * Cheap fuzzy match: every character of `query` must appear in `target` in
 * order (subsequence match). Score rewards consecutive matches and matches
 * right after a word boundary; returns 0 when no match.
 *
 * Both inputs are expected lowercase.
 */
function fuzzyScore(query: string, target: string): number {
  if (!query) return 1;
  if (!target) return 0;
  // Fast path: exact substring match dominates any fuzzy hit.
  const direct = target.indexOf(query);
  if (direct === 0) return 10000;
  if (direct > 0) return 5000 - direct;

  let score = 0;
  let ti = 0;
  let lastMatch = -2;
  for (let qi = 0; qi < query.length; qi++) {
    const qc = query.charCodeAt(qi);
    let found = -1;
    while (ti < target.length) {
      if (target.charCodeAt(ti) === qc) {
        found = ti;
        ti++;
        break;
      }
      ti++;
    }
    if (found === -1) return 0;

    let bonus = 10;
    if (found === lastMatch + 1) bonus += 15; // consecutive
    if (found === 0) bonus += 20; // prefix
    else {
      const prev = target.charCodeAt(found - 1);
      // Word-boundary bonus (space / - / _ / . before the matched char).
      if (prev === 32 || prev === 45 || prev === 95 || prev === 46) bonus += 10;
    }
    score += bonus;
    lastMatch = found;
  }
  return score;
}
