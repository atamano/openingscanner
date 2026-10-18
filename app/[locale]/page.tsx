"use client";

import { AlertCircle, ShieldCheck } from "lucide-react";
import { parseAsString, parseAsStringLiteral, useQueryState } from "nuqs";
import { Suspense, useState } from "react";
import { Header } from "@/components/layout/header";
import { Dashboard } from "@/components/scanner/dashboard";
import { ScanForm } from "@/components/scanner/scan-form";
import { ScanLivePreview } from "@/components/scanner/scan-live-preview";
import { ScanProgress } from "@/components/scanner/scan-progress";
import { ScanSummaryBar } from "@/components/scanner/scan-summary-bar";
import { useScanner } from "@/hooks/use-scanner";
import { useDictionary } from "@/lib/i18n/context";
import { DashboardFiltersProvider } from "@/lib/state/dashboard-filters";
import {
  DATE_PRESETS,
  SCAN_COLORS,
  TIME_CLASSES,
} from "@/lib/scan/params";
import type { ScanParams, TimeClass } from "@/lib/sources/types";

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <HomeInner />
    </Suspense>
  );
}

function HomeInner() {
  const dict = useDictionary();
  const {
    status,
    progress,
    stats,
    error,
    maxGames,
    submittedSources,
    scan,
    abort,
    reset,
  } = useScanner();

  const [color] = useQueryState(
    "c",
    parseAsStringLiteral(SCAN_COLORS).withDefault("both"),
  );
  const [times] = useQueryState("tc", parseAsString.withDefault("blitz,rapid"));
  const [datePreset] = useQueryState(
    "d",
    parseAsStringLiteral(DATE_PRESETS).withDefault("1y"),
  );
  const timeClasses: TimeClass[] = times
    ? (times.split(",").filter((v): v is TimeClass =>
        (TIME_CLASSES as readonly string[]).includes(v),
      ) as TimeClass[])
    : [];

  const started = status !== "idle";
  const [expanded, setExpanded] = useState(false);

  const [scanGen, setScanGen] = useState(0);
  const submit = (params: ScanParams) => {
    setScanGen((g) => g + 1);
    scan(params);
    setExpanded(false);
  };

  const newScan = () => {
    reset();
    setExpanded(true);
  };

  if (!started) {
    return <LandingHero onSubmit={submit} />;
  }

  return (
    <DashboardFiltersProvider resetKey={scanGen}>
      <div className="min-h-screen flex flex-col bg-background">
        <Header onNewScan={newScan} />

        <div className="animate-workspace-enter">
          <div className="mx-auto max-w-7xl px-3 py-4 space-y-4 sm:px-4 sm:py-6 sm:space-y-5">
            <ScanSummaryBar
              running={status === "running"}
              progress={progress}
              stats={stats}
              sources={submittedSources}
              color={color}
              timeClasses={timeClasses}
              window={datePreset}
              expanded={expanded}
              onToggle={() => setExpanded((v) => !v)}
              onReset={newScan}
              onAbort={abort}
            />

            {expanded ? (
              <section className="sticker rounded-2xl bg-card p-4 sm:p-5 animate-fade-up">
                <ScanForm
                  onSubmit={submit}
                  running={status === "running"}
                  onAbort={abort}
                  optionsOpenByDefault
                />
              </section>
            ) : null}

            {status === "running" ? (
              <>
                <ScanProgress
                  progress={progress}
                  running
                  expected={maxGames}
                />
                <ScanLivePreview progress={progress} />
              </>
            ) : null}

            {error ? (
              <div className="sticker rounded-2xl bg-card p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="mt-0.5 h-4 w-4 text-destructive shrink-0" />
                  <div>
                    <div className="text-sm font-semibold text-destructive">
                      {dict.page.scanFailed}
                    </div>
                    <div className="text-xs text-ink-light mt-0.5">{error}</div>
                  </div>
                </div>
              </div>
            ) : null}

            {status === "done" && stats && stats.totalGames > 0 ? (
              <Dashboard stats={stats} />
            ) : null}

            {status === "done" && stats && stats.totalGames === 0 ? (
              <div className="sticker rounded-2xl bg-card p-10 text-center text-sm text-ink-light">
                <p className="font-medium text-foreground">
                  {dict.page.noGamesMatched}
                </p>
                <p className="mt-1">{dict.page.widenTryHint}</p>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </DashboardFiltersProvider>
  );
}

// Pieces floating around the hero, one per pop color. Decorative only.
const HERO_STICKERS = [
  { glyph: "♛", className: "left-[5%] top-[14%] -rotate-12 bg-primary text-primary-foreground" },
  { glyph: "♜", className: "right-[7%] top-[12%] rotate-12 bg-pop-pink text-on-pop" },
  { glyph: "♝", className: "left-[8%] bottom-[22%] rotate-6 bg-pop-yellow text-on-pop" },
  { glyph: "♚", className: "right-[10%] bottom-[26%] -rotate-6 bg-pop-sky text-on-pop" },
];

function LandingHero({
  onSubmit,
}: {
  onSubmit: (params: ScanParams) => void;
}) {
  const dict = useDictionary();
  const steps = [
    { glyph: "♟", label: dict.landing.stepUsername, className: "bg-pop-yellow text-on-pop" },
    { glyph: "♞", label: dict.landing.stepScan, className: "bg-pop-pink text-on-pop -rotate-2" },
    { glyph: "♚", label: dict.landing.stepExplore, className: "bg-primary text-primary-foreground rotate-2" },
  ];
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="relative flex-1 overflow-hidden px-4 pt-8 pb-14 sm:pt-14">
        {HERO_STICKERS.map((s) => (
          <span
            key={s.glyph}
            aria-hidden
            className={`sticker-lg chess-glyph absolute hidden h-24 w-24 place-items-center rounded-3xl text-7xl xl:grid ${s.className}`}
          >
            {s.glyph}
          </span>
        ))}

        <div className="relative z-10 mx-auto w-full max-w-2xl">
          <h1 className="text-center text-[2.5rem] font-extrabold leading-[0.95] tracking-[-0.035em] text-balance text-foreground sm:text-6xl">
            {dict.landing.subtitle}
          </h1>

          <div className="sticker-lg mt-8 rounded-3xl bg-card p-4 sm:mt-10 sm:p-6">
            <ScanForm onSubmit={onSubmit} running={false} onAbort={() => {}} />
          </div>

          <ol className="mt-12 grid grid-cols-3 gap-3 sm:mt-16 sm:gap-4">
            {steps.map((step) => (
              <li
                key={step.glyph}
                className={`sticker flex flex-col items-center gap-2 rounded-3xl px-2 py-4 text-center sm:py-5 ${step.className}`}
              >
                <span aria-hidden className="chess-glyph text-5xl sm:text-6xl">
                  {step.glyph}
                </span>
                <span className="text-xs font-extrabold leading-tight sm:text-base">
                  {step.label}
                </span>
              </li>
            ))}
          </ol>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-2 text-sm font-semibold">
            <span className="sticker-sm inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5">
              <ShieldCheck className="h-4 w-4 text-primary" />
              {dict.landing.footer}
            </span>
            <a
              href="https://github.com/atamano/openingscanner"
              target="_blank"
              rel="noopener"
              className="sticker-sm sticker-press inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="h-4 w-4">
                <path d="M12 .5C5.73.5.75 5.48.75 11.75c0 4.98 3.22 9.2 7.69 10.7.56.1.77-.24.77-.54v-1.9c-3.13.68-3.79-1.5-3.79-1.5-.51-1.3-1.25-1.65-1.25-1.65-1.02-.7.08-.68.08-.68 1.13.08 1.72 1.16 1.72 1.16 1 1.72 2.64 1.22 3.28.93.1-.73.39-1.22.71-1.5-2.5-.28-5.13-1.25-5.13-5.58 0-1.23.44-2.23 1.16-3.02-.12-.28-.5-1.43.11-2.97 0 0 .95-.3 3.1 1.15.9-.25 1.86-.37 2.82-.37.96 0 1.93.12 2.82.37 2.15-1.45 3.1-1.15 3.1-1.15.61 1.54.23 2.69.11 2.97.72.79 1.16 1.79 1.16 3.02 0 4.34-2.64 5.3-5.15 5.57.4.35.76 1.03.76 2.08v3.08c0 .3.2.64.78.53 4.47-1.5 7.68-5.72 7.68-10.7C23.25 5.48 18.27.5 12 .5z" />
              </svg>
              {dict.landing.openSource}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
