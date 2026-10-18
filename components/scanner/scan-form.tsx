"use client";

import { ChevronDown, Loader2, Plus, Search, SlidersHorizontal, X } from "lucide-react";
import { useMemo, useState } from "react";
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
  /** Show the color / time / window / limit options without a click. */
  optionsOpenByDefault?: boolean;
}

export function ScanForm({
  onSubmit,
  running,
  onAbort,
  optionsOpenByDefault = false,
}: ScanFormProps) {
  const dict = useDictionary();
  const [optionsOpen, setOptionsOpen] = useState(optionsOpenByDefault);

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
      <div className="space-y-2.5">
        {ccRows.map((value, i) => (
          <SourceRow
            key={`cc-${i}`}
            label="Chess.com"
            icon="♘"
            tone="sky"
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
            tone="pink"
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
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          {(["chesscom", "lichess"] as const).map((platform) => (
            <button
              key={platform}
              type="button"
              onClick={() => addRow(platform)}
              disabled={running}
              title={dict.form.sourcesHint}
              className="inline-flex h-7 items-center gap-1 rounded-full px-2 text-xs font-semibold text-ink-light transition-colors hover:text-foreground disabled:opacity-40"
            >
              <Plus className="h-3.5 w-3.5" />
              {dict.form.addAccount.replace(
                "{platform}",
                platform === "chesscom" ? "Chess.com" : "Lichess",
              )}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-0.5 text-xs font-bold text-ink-light">
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
                className="h-7 px-3 rounded-full text-xs font-semibold border-2"
              >
                {p.label}
              </ChipButton>
            );
          })}
        </div>
      </div>

      {/* One primary action. Everything else folds behind "Options", with a
          one-line summary so the hidden state is never a surprise. */}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={() => setOptionsOpen((v) => !v)}
          aria-expanded={optionsOpen}
          className="inline-flex min-w-0 items-center gap-2 self-start rounded-full px-1 py-1 text-sm font-semibold text-ink-light transition-colors hover:text-foreground sm:self-auto"
        >
          <SlidersHorizontal className="h-4 w-4 shrink-0 text-primary" />
          <span>{dict.form.moreOptions}</span>
          {!optionsOpen ? (
            <span className="hidden truncate text-xs font-normal md:inline">
              {[
                colorLabel(color),
                selectedTimes.map((t) => timeLabels[t]).join(", "),
                dateLabels[datePreset],
              ]
                .filter(Boolean)
                .join(" · ")}
            </span>
          ) : null}
          <ChevronDown
            className={`h-4 w-4 shrink-0 transition-transform ${optionsOpen ? "rotate-180" : ""}`}
          />
        </button>
        <div className="hidden flex-1 sm:block" />
        {!running ? (
          <button
            type="submit"
            disabled={!canSubmit}
            className="sticker sticker-press h-12 w-full rounded-2xl bg-primary px-7 text-base font-extrabold text-primary-foreground disabled:cursor-not-allowed disabled:bg-muted disabled:text-ink-light sm:w-auto"
          >
            {dict.form.submit}
          </button>
        ) : (
          <button
            type="button"
            onClick={onAbort}
            className="sticker sticker-press flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-destructive px-6 text-base font-extrabold text-destructive-foreground sm:w-auto"
          >
            <Loader2 className="h-4 w-4 animate-spin" />
            {dict.form.stop}
          </button>
        )}
      </div>

      {optionsOpen ? (
        <div className="grid gap-4 rounded-2xl bg-muted p-4 sm:grid-cols-2 animate-fade-up">
          <OptionGroup label={dict.form.asColorPrefix} className="sm:col-span-2">
            {(["white", "black", "both"] as const).map((c) => (
              <ChipButton
                key={c}
                active={color === c}
                onClick={() => setColor(c)}
                disabled={running}
                className="h-8 px-3 rounded-full text-xs font-semibold border-2"
              >
                <span aria-hidden className="chess-glyph mr-1">
                  {c === "white" ? "♔" : c === "black" ? "♚" : "♔♚"}
                </span>
                {colorLabel(c)}
              </ChipButton>
            ))}
          </OptionGroup>

          <OptionGroup label={dict.form.timeControls}>
            {TIME_VALUES.map((value) => (
              <ChipButton
                key={value}
                active={selectedTimes.includes(value)}
                onClick={() => toggleTime(value)}
                disabled={running}
                className="h-8 px-3 rounded-full text-xs font-semibold border-2"
              >
                {timeLabels[value]}
              </ChipButton>
            ))}
          </OptionGroup>

          <OptionGroup label={dict.form.window}>
            {DATE_VALUES.map((value) => (
              <ChipButton
                key={value}
                active={datePreset === value}
                onClick={() => setDatePreset(value)}
                disabled={running}
                className="h-8 px-3 rounded-full text-xs font-semibold border-2"
              >
                {dateLabels[value]}
              </ChipButton>
            ))}
          </OptionGroup>

          <OptionGroup label={dict.form.limit}>
            {LIMIT_VALUES.map((value) => (
              <ChipButton
                key={value}
                active={limitPreset === value}
                onClick={() => setLimitPreset(value)}
                disabled={running}
                className="h-8 px-3 rounded-full text-xs font-semibold border-2"
              >
                {limitLabels[value]}
              </ChipButton>
            ))}
          </OptionGroup>

          <label className="flex cursor-pointer select-none items-center gap-2 self-end text-sm font-semibold text-ink-light">
            <input
              type="checkbox"
              checked={rated}
              onChange={(e) => setRated(e.target.checked)}
              disabled={running}
              className="h-4 w-4 rounded border-border accent-primary"
            />
            {dict.form.ratedOnly}
          </label>
        </div>
      ) : null}
    </form>
  );
}

function OptionGroup({
  label,
  className = "",
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <span className="text-xs font-bold text-ink-light">{label}</span>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

interface SourceRowProps {
  label: string;
  icon: string;
  tone: "sky" | "pink";
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
  tone,
  value,
  onChange,
  placeholder,
  disabled,
  onRemove,
  removeLabel,
}: SourceRowProps) {
  return (
    <div className="sticker-sm flex items-center gap-2 rounded-2xl bg-card p-1.5 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring">
      <span
        className={`inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl px-3 text-xs font-bold text-on-pop ${tone === "sky" ? "bg-pop-sky" : "bg-pop-pink"}`}
      >
        <span aria-hidden className="chess-glyph text-base">{icon}</span>
        <span>{label}</span>
      </span>
      <Search aria-hidden className="h-4 w-4 shrink-0 text-ink-light" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        autoComplete="off"
        spellCheck={false}
        disabled={disabled}
        className="h-10 min-w-0 flex-1 bg-transparent text-base font-semibold text-foreground placeholder:font-normal placeholder:text-ink-light outline-none"
      />
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          disabled={disabled}
          aria-label={removeLabel ?? "Remove account"}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-ink-light hover:bg-muted hover:text-foreground transition-colors disabled:opacity-40"
        >
          <X className="h-4 w-4" />
        </button>
      ) : null}
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
