"use client";

import { Loader2, Plus, Search, X } from "lucide-react";
import { useMemo } from "react";
import {
  parseAsBoolean,
  parseAsString,
  parseAsStringLiteral,
  useQueryState,
} from "nuqs";
// `String.split(",")` always returns ≥1 element so a fallback would be
// unreachable. Kept as a tiny named helper purely for readability at the
// call site.
const parseRows = (raw: string) => raw.split(",");
const serializeRows = (rows: string[]) => rows.join(",");
import { useDictionary } from "@/lib/i18n/context";
import {
  DATE_PRESETS,
  LIMIT_PRESETS,
  SCAN_COLORS,
  TIME_CLASSES,
  limitPresetToCount,
  type DatePreset,
  type LimitPreset,
} from "@/lib/scan/params";
import type {
  Platform,
  ScanParams,
  ScanSource,
  TimeClass,
} from "@/lib/sources/types";
import { ChipButton } from "./chip-button";

const TIME_VALUES = [
  "bullet",
  "blitz",
  "rapid",
  "classical",
  "correspondence",
] as const;
const DATE_VALUES = DATE_PRESETS;
const LIMIT_VALUES = LIMIT_PRESETS;

// One pill per player, mapping to whichever handles exist on each platform.
// Clicking the pill sets both inputs at once (and clears the platform that
// the player doesn't use, so switching pills isn't sticky). Curated for
// players who actually post games regularly.
interface PopularPlayer {
  label: string;
  chesscom?: string;
  lichess?: string;
}
const POPULAR_PLAYERS: PopularPlayer[] = [
  { label: "Hikaru", chesscom: "Hikaru" },
  { label: "Magnus", chesscom: "MagnusCarlsen", lichess: "DrNykterstein" },
  { label: "Caruana", chesscom: "FabianoCaruana" },
  { label: "Levy", chesscom: "GothamChess" },
  { label: "Anna", chesscom: "AnnaCramling" },
  { label: "Eric Rosen", lichess: "EricRosen" },
  { label: "Zhigalko", lichess: "Zhigalko_Sergei" },
  { label: "Kovalev", lichess: "Konevlad" },
];

interface ScanFormProps {
  onSubmit: (params: ScanParams) => void;
  running: boolean;
  onAbort: () => void;
}

export function ScanForm({ onSubmit, running, onAbort }: ScanFormProps) {
  const dict = useDictionary();

  const [chesscomRaw, setChesscomRaw] = useQueryState(
    "u_cc",
    parseAsString.withDefault(""),
  );
  const [lichessRaw, setLichessRaw] = useQueryState(
    "u_li",
    parseAsString.withDefault(""),
  );
  const [color, setColor] = useQueryState(
    "c",
    parseAsStringLiteral(SCAN_COLORS).withDefault("both"),
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
    parseAsStringLiteral(DATE_PRESETS).withDefault("1y"),
  );
  const [limitPreset, setLimitPreset] = useQueryState(
    "l",
    parseAsStringLiteral(LIMIT_PRESETS).withDefault("2k"),
  );

  const selectedTimes = useMemo<TimeClass[]>(
    () =>
      times
        ? (times.split(",").filter((v): v is TimeClass =>
            (TIME_CLASSES as readonly string[]).includes(v),
          ) as TimeClass[])
        : [],
    [times],
  );

  const ccRows = parseRows(chesscomRaw);
  const liRows = parseRows(lichessRaw);

  const updateRow = (platform: Platform, idx: number, value: string) => {
    const next = platform === "chesscom" ? [...ccRows] : [...liRows];
    next[idx] = value.replace(/,/g, "");
    (platform === "chesscom" ? setChesscomRaw : setLichessRaw)(
      serializeRows(next),
    );
  };

  const removeRow = (platform: Platform, idx: number) => {
    const list = platform === "chesscom" ? ccRows : liRows;
    if (list.length <= 1) return;
    const next = list.filter((_, i) => i !== idx);
    (platform === "chesscom" ? setChesscomRaw : setLichessRaw)(
      serializeRows(next),
    );
  };

  const addRow = (platform: Platform) => {
    const list = platform === "chesscom" ? ccRows : liRows;
    (platform === "chesscom" ? setChesscomRaw : setLichessRaw)(
      serializeRows([...list, ""]),
    );
  };

  // Dedupe on `${platform}:${lowercased handle}` so a duplicate handle
  // doesn't double-count games, and skip empty rows. Worker fetches
  // platforms in parallel, so chess.com order is no longer load-bearing.
  const sources: ScanSource[] = (() => {
    const seen = new Set<string>();
    const out: ScanSource[] = [];
    const push = (platform: Platform, handle: string) => {
      const trimmed = handle.trim();
      if (!trimmed) return;
      const key = `${platform}:${trimmed.toLowerCase()}`;
      if (seen.has(key)) return;
      seen.add(key);
      out.push({ platform, username: trimmed });
    };
    for (const u of ccRows) push("chesscom", u);
    for (const u of liRows) push("lichess", u);
    return out;
  })();

  const canSubmit = sources.length > 0 && !running;

  const timeLabels: Record<(typeof TIME_VALUES)[number], string> = {
    bullet: dict.form.timeBullet,
    blitz: dict.form.timeBlitz,
    rapid: dict.form.timeRapid,
    classical: dict.form.timeClassical,
    correspondence: dict.form.timeCorrespondence,
  };

  const dateLabels: Record<DatePreset, string> = {
    "30d": dict.form.window30d,
    "6m": dict.form.window6m,
    "1y": dict.form.window1y,
    all: dict.form.windowAll,
  };

  const limitLabels: Record<LimitPreset, string> = {
    "500": "500",
    "2k": "2k",
    "5k": "5k",
    "10k": "10k",
    all: dict.form.limitAll,
  };

  const colorLabel = (c: "white" | "black" | "both") => {
    if (c === "both") return dict.form.colorBoth;
    if (c === "white") return dict.form.colorWhite;
    return dict.form.colorBlack;
  };

  const submit = () => {
    if (!canSubmit) return;
    const since = datePresetToSince(datePreset);
    onSubmit({
      sources,
      filters: {
        color,
        ratedOnly: rated,
        timeClasses: selectedTimes,
        since,
        maxGames: limitPresetToCount(limitPreset),
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
      {/* Players: any number of accounts per platform, all merged into one
          repertoire. The "+ Add Chess.com / Lichess" buttons append blank
          rows so the user can paste a second handle. */}
      <div className="space-y-2">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[11px] uppercase tracking-widest text-ink-light font-semibold">
            {dict.form.sourcesTitle}
          </span>
          <span className="text-[11px] text-ink-light/70">
            {dict.form.sourcesHint}
          </span>
        </div>
        {ccRows.map((value, i) => (
          <SourceRow
            key={`cc-${i}`}
            label="Chess.com"
            icon="♘"
            value={value}
            onChange={(v) => updateRow("chesscom", i, v)}
            placeholder={dict.form.placeholderChesscom}
            disabled={running}
            onRemove={
              ccRows.length > 1
                ? () => removeRow("chesscom", i)
                : undefined
            }
            removeLabel={dict.form.removeAccount}
          />
        ))}
        {liRows.map((value, i) => (
          <SourceRow
            key={`li-${i}`}
            label="Lichess"
            icon="♞"
            value={value}
            onChange={(v) => updateRow("lichess", i, v)}
            placeholder={dict.form.placeholderLichess}
            disabled={running}
            onRemove={
              liRows.length > 1
                ? () => removeRow("lichess", i)
                : undefined
            }
            removeLabel={dict.form.removeAccount}
          />
        ))}
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          <ChipButton
            onClick={() => addRow("chesscom")}
            disabled={running}
            className="h-7 px-2.5 rounded-md text-xs font-medium border inline-flex items-center gap-1"
          >
            <Plus className="h-3 w-3" />
            {dict.form.addAccount.replace("{platform}", "Chess.com")}
          </ChipButton>
          <ChipButton
            onClick={() => addRow("lichess")}
            disabled={running}
            className="h-7 px-2.5 rounded-md text-xs font-medium border inline-flex items-center gap-1"
          >
            <Plus className="h-3 w-3" />
            {dict.form.addAccount.replace("{platform}", "Lichess")}
          </ChipButton>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          <span className="text-[10px] uppercase tracking-widest text-ink-light/70 font-semibold">
            {dict.form.popular}
          </span>
          {/* Compare against the parsed handle list, not the raw URL string —
              with multi-row support, a trailing empty row leaves the raw
              value as e.g. "Hikaru,", which would never equal "Hikaru". */}
          {POPULAR_PLAYERS.map((p) => {
            const ccPreset = (p.chesscom ?? "").toLowerCase();
            const liPreset = (p.lichess ?? "").toLowerCase();
            const ccActual = ccRows
              .map((s) => s.trim().toLowerCase())
              .filter(Boolean);
            const liActual = liRows
              .map((s) => s.trim().toLowerCase())
              .filter(Boolean);
            const ccActive = ccPreset
              ? ccActual.length === 1 && ccActual[0] === ccPreset
              : ccActual.length === 0;
            const liActive = liPreset
              ? liActual.length === 1 && liActual[0] === liPreset
              : liActual.length === 0;
            const active = ccActive && liActive;
            return (
              <ChipButton
                key={p.label}
                active={active}
                onClick={() => {
                  setChesscomRaw(p.chesscom ?? "");
                  setLichessRaw(p.lichess ?? "");
                }}
                disabled={running}
                title={[p.chesscom && `${p.chesscom} on Chess.com`, p.lichess && `${p.lichess} on Lichess`]
                  .filter(Boolean)
                  .join(" · ")}
                className="h-7 px-2.5 rounded-full text-xs font-medium border"
              >
                {p.label}
              </ChipButton>
            );
          })}
        </div>
      </div>

      {/* Color selector + submit. Stacks on mobile, single row from sm+. */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="flex w-full rounded-lg border border-border overflow-hidden sm:w-auto">
          {(["white", "black", "both"] as const).map((c) => (
            <ChipButton
              key={c}
              active={color === c}
              onClick={() => setColor(c)}
              disabled={running}
              className="h-10 flex-1 px-3 text-sm font-medium sm:flex-none sm:px-4"
              activeClassName="text-amber-dark"
              inactiveClassName="text-ink-light hover:text-foreground hover:bg-paper-dark"
            >
              {c === "white" ? "○ " : c === "black" ? "● " : ""}
              {colorLabel(c)}
            </ChipButton>
          ))}
        </div>
        <div className="hidden flex-1 sm:block" />
        {!running ? (
          <button
            type="submit"
            disabled={!canSubmit}
            className="h-11 w-full rounded-lg bg-wood px-6 text-sm font-semibold text-paper transition-all shadow-md hover:bg-wood-light hover:shadow-lg active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 sm:h-10 sm:w-auto"
          >
            {dict.form.submit}
          </button>
        ) : (
          <button
            type="button"
            onClick={onAbort}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-destructive px-5 text-sm font-semibold text-destructive-foreground transition-colors hover:bg-destructive/90 sm:h-10 sm:w-auto"
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
                <ChipButton
                  key={value}
                  active={active}
                  onClick={() => toggleTime(value)}
                  disabled={running}
                  className="h-8 px-3 rounded-md text-xs font-medium border"
                >
                  {timeLabels[value]}
                </ChipButton>
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
                <ChipButton
                  key={value}
                  active={active}
                  onClick={() => setDatePreset(value)}
                  disabled={running}
                  className="h-8 px-3 rounded-md text-xs font-medium border"
                >
                  {dateLabels[value]}
                </ChipButton>
              );
            })}
          </div>
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <span className="text-[11px] uppercase tracking-widest text-ink-light font-semibold">
            {dict.form.limit}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {LIMIT_VALUES.map((value) => {
              const active = limitPreset === value;
              return (
                <ChipButton
                  key={value}
                  active={active}
                  onClick={() => setLimitPreset(value)}
                  disabled={running}
                  className="h-8 px-3 rounded-md text-xs font-medium border"
                >
                  {limitLabels[value]}
                </ChipButton>
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

interface SourceRowProps {
  label: string;
  icon: string;
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
  disabled: boolean;
  onRemove?: () => void;
  removeLabel?: string;
}

function SourceRow({
  label,
  icon,
  value,
  onChange,
  placeholder,
  disabled,
  onRemove,
  removeLabel,
}: SourceRowProps) {
  return (
    <div className="flex items-stretch gap-2">
      <span className="inline-flex h-12 w-24 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-border bg-paper-dark px-2.5 text-xs font-semibold text-ink-light">
        <span>{icon}</span>
        <span>{label}</span>
      </span>
      <div className="relative flex-1">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-light/40" />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck={false}
          disabled={disabled}
          className={`w-full h-12 pl-10 ${onRemove ? "pr-12" : "pr-4"} rounded-lg border border-border bg-paper-dark text-base font-mono text-foreground placeholder:text-ink-light/40 focus:border-amber focus:ring-2 focus:ring-amber/20 outline-none transition-all`}
        />
        {onRemove ? (
          <button
            type="button"
            onClick={onRemove}
            disabled={disabled}
            aria-label={removeLabel ?? "Remove account"}
            className="absolute right-2 top-1/2 -translate-y-1/2 grid h-7 w-7 place-items-center rounded-md text-ink-light/60 hover:bg-paper hover:text-foreground transition-colors disabled:opacity-40"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>
    </div>
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
