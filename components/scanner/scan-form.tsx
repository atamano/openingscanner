"use client";

import { Loader2, Search } from "lucide-react";
import { useMemo } from "react";
import { parseAsBoolean, parseAsString, useQueryState } from "nuqs";
import { useDictionary } from "@/lib/i18n/context";
import type {
  Platform,
  ScanColor,
  ScanParams,
  TimeClass,
} from "@/lib/sources/types";

const TIME_VALUES = ["bullet", "blitz", "rapid", "classical"] as const;
const DATE_VALUES = ["30d", "6m", "1y", "all"] as const;
type DatePreset = (typeof DATE_VALUES)[number];

// Curated list of handles that actually post games regularly (super-GMs and
// active streamers). Lichess in particular — avoid accounts that are mostly
// dormant (e.g. alireza2003 plays very few games there).
const POPULAR_PLAYERS: Record<Platform, { handle: string; label: string }[]> = {
  lichess: [
    { handle: "DrNykterstein", label: "Magnus" },
    { handle: "penguingm1", label: "Hikaru" },
    { handle: "Zhigalko_Sergei", label: "Zhigalko" },
    { handle: "Konevlad", label: "Kovalev" },
    { handle: "EricRosen", label: "Eric Rosen" },
  ],
  chesscom: [
    { handle: "Hikaru", label: "Hikaru" },
    { handle: "MagnusCarlsen", label: "Magnus" },
    { handle: "FabianoCaruana", label: "Caruana" },
    { handle: "GothamChess", label: "Levy" },
    { handle: "AnnaCramling", label: "Anna" },
  ],
};

interface ScanFormProps {
  onSubmit: (params: ScanParams) => void;
  running: boolean;
  onAbort: () => void;
}

export function ScanForm({ onSubmit, running, onAbort }: ScanFormProps) {
  const dict = useDictionary();

  const [username, setUsername] = useQueryState(
    "u",
    parseAsString.withDefault(""),
  );
  const [platform, setPlatform] = useQueryState(
    "p",
    parseAsString.withDefault("chesscom"),
  );
  const [color, setColor] = useQueryState(
    "c",
    parseAsString.withDefault("both"),
  );
  const [rated, setRated] = useQueryState(
    "rated",
    parseAsBoolean.withDefault(true),
  );
  const [times, setTimes] = useQueryState(
    "tc",
    parseAsString.withDefault("blitz,rapid"),
  );
  const [datePreset, setDatePreset] = useQueryState(
    "d",
    parseAsString.withDefault("1y"),
  );

  const selectedTimes = useMemo(
    () => (times ? times.split(",").filter(Boolean) : []) as TimeClass[],
    [times],
  );

  const canSubmit = username.trim().length > 0 && !running;

  const timeLabels: Record<(typeof TIME_VALUES)[number], string> = {
    bullet: dict.form.timeBullet,
    blitz: dict.form.timeBlitz,
    rapid: dict.form.timeRapid,
    classical: dict.form.timeClassical,
  };

  const dateLabels: Record<DatePreset, string> = {
    "30d": dict.form.window30d,
    "6m": dict.form.window6m,
    "1y": dict.form.window1y,
    all: dict.form.windowAll,
  };

  const colorLabel = (c: "white" | "black" | "both") => {
    if (c === "both") return dict.form.colorBoth;
    if (c === "white") return dict.form.colorWhite;
    return dict.form.colorBlack;
  };

  const submit = () => {
    if (!canSubmit) return;
    const since = datePresetToSince(datePreset as DatePreset);
    onSubmit({
      platform: platform as Platform,
      username: username.trim(),
      filters: {
        color: color as ScanColor,
        ratedOnly: rated,
        timeClasses: selectedTimes,
        since,
        maxGames: 2000,
      },
    });
  };

  const toggleTime = (value: TimeClass) => {
    const set = new Set(selectedTimes);
    if (set.has(value)) set.delete(value);
    else set.add(value);
    setTimes(Array.from(set).join(","));
  };

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      {/* Platform selector */}
      <div className="grid grid-cols-2 gap-1.5">
        {(
          [
            { value: "chesscom" as const, label: "Chess.com", icon: "\u2658" },
            { value: "lichess" as const, label: "Lichess", icon: "\u265E" },
          ]
        ).map(({ value, label, icon }) => (
          <button
            key={value}
            type="button"
            onClick={() => {
              setPlatform(value);
              if (value !== platform) setUsername("");
            }}
            disabled={running}
            className={`h-10 rounded-lg text-sm font-medium transition-all border ${
              platform === value
                ? "bg-amber/12 border-amber/40 text-amber-dark shadow-sm"
                : "border-border text-ink-light hover:border-amber/30 hover:text-foreground"
            } disabled:opacity-40`}
            style={
              platform === value
                ? { backgroundColor: "rgba(176,122,46,0.12)" }
                : undefined
            }
          >
            <span className="mr-1.5">{icon}</span>
            {label}
          </button>
        ))}
      </div>

      {/* Username input */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-light/40" />
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder={
              platform === "lichess"
                ? dict.form.placeholderLichess
                : dict.form.placeholderChesscom
            }
            autoComplete="off"
            spellCheck={false}
            disabled={running}
            className="w-full h-12 pl-10 pr-4 rounded-lg border border-border bg-paper-dark text-base font-mono text-foreground placeholder:text-ink-light/40 focus:border-amber focus:ring-2 focus:ring-amber/20 outline-none transition-all"
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] uppercase tracking-widest text-ink-light font-semibold">
            {dict.form.popular}
          </span>
          {POPULAR_PLAYERS[platform as Platform].map((p) => {
            const active =
              username.trim().toLowerCase() === p.handle.toLowerCase();
            return (
              <button
                key={p.handle}
                type="button"
                onClick={() => setUsername(p.handle)}
                disabled={running}
                title={p.handle}
                className={`h-7 px-2.5 rounded-full text-xs font-medium transition-all border ${
                  active
                    ? "border-amber/40 text-amber-dark"
                    : "border-border text-ink-light hover:border-amber/30 hover:text-foreground"
                } disabled:opacity-40`}
                style={
                  active
                    ? { backgroundColor: "rgba(176,122,46,0.12)" }
                    : undefined
                }
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Color selector */}
      <div className="flex items-center gap-2">
        <div className="flex rounded-lg border border-border overflow-hidden">
          {(["white", "black", "both"] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              disabled={running}
              className={`h-10 px-4 text-sm font-medium transition-all ${
                color === c
                  ? "text-amber-dark"
                  : "text-ink-light hover:text-foreground hover:bg-paper-dark"
              } disabled:opacity-40`}
              style={
                color === c
                  ? { backgroundColor: "rgba(176,122,46,0.12)" }
                  : undefined
              }
            >
              {c === "white" ? "\u25CB " : c === "black" ? "\u25CF " : ""}
              {colorLabel(c)}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        {!running ? (
          <button
            type="submit"
            disabled={!canSubmit}
            className="h-10 px-6 rounded-lg bg-wood text-paper text-sm font-semibold hover:bg-wood-light disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg active:scale-[0.98]"
          >
            {dict.form.submit}
          </button>
        ) : (
          <button
            type="button"
            onClick={onAbort}
            className="h-10 px-5 rounded-lg bg-destructive text-destructive-foreground text-sm font-semibold hover:bg-destructive/90 transition-colors flex items-center gap-2"
          >
            <Loader2 className="h-4 w-4 animate-spin" />
            {dict.form.stop}
          </button>
        )}
      </div>

      {/* Advanced filters */}
      <div className="grid gap-3 border-t border-border/60 pt-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <span className="text-[11px] uppercase tracking-widest text-ink-light font-semibold">
            {dict.form.timeControls}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {TIME_VALUES.map((value) => {
              const active = selectedTimes.includes(value);
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => toggleTime(value)}
                  disabled={running}
                  className={`h-8 px-3 rounded-md text-xs font-medium transition-all border ${
                    active
                      ? "border-amber/40 text-amber-dark"
                      : "border-border text-ink-light hover:border-amber/30 hover:text-foreground"
                  } disabled:opacity-40`}
                  style={
                    active
                      ? { backgroundColor: "rgba(176,122,46,0.12)" }
                      : undefined
                  }
                >
                  {timeLabels[value]}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-1.5">
          <span className="text-[11px] uppercase tracking-widest text-ink-light font-semibold">
            {dict.form.window}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {DATE_VALUES.map((value) => {
              const active = datePreset === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setDatePreset(value)}
                  disabled={running}
                  className={`h-8 px-3 rounded-md text-xs font-medium transition-all border ${
                    active
                      ? "border-amber/40 text-amber-dark"
                      : "border-border text-ink-light hover:border-amber/30 hover:text-foreground"
                  } disabled:opacity-40`}
                  style={
                    active
                      ? { backgroundColor: "rgba(176,122,46,0.12)" }
                      : undefined
                  }
                >
                  {dateLabels[value]}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <label className="flex items-center gap-2 text-xs text-ink-light cursor-pointer select-none">
        <input
          type="checkbox"
          checked={rated}
          onChange={(e) => setRated(e.target.checked)}
          disabled={running}
          className="h-3.5 w-3.5 rounded border-border accent-amber"
        />
        {dict.form.ratedOnly}
      </label>
    </form>
  );
}

function datePresetToSince(preset: DatePreset): number | undefined {
  const now = Date.now();
  switch (preset) {
    case "30d":
      return now - 30 * 24 * 60 * 60 * 1000;
    case "6m":
      return now - 6 * 30 * 24 * 60 * 60 * 1000;
    case "1y":
      return now - 365 * 24 * 60 * 60 * 1000;
    case "all":
    default:
      return undefined;
  }
}
