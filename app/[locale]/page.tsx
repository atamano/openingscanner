"use client";

import { AlertCircle, Radar } from "lucide-react";
import { parseAsString, parseAsStringLiteral, useQueryState } from "nuqs";
import { Suspense, useEffect, useRef, useState } from "react";
import { Header } from "@/components/layout/header";
import { Dashboard } from "@/components/scanner/dashboard";
import { ScanForm } from "@/components/scanner/scan-form";
import { ScanProgress } from "@/components/scanner/scan-progress";
import { ScanSummaryBar } from "@/components/scanner/scan-summary-bar";
import { useScanner } from "@/hooks/use-scanner";
import { useDictionary } from "@/lib/i18n/context";
import { DashboardFiltersProvider } from "@/lib/state/dashboard-filters";
import {
  DATE_PRESETS,
  PLATFORMS,
  SCAN_COLORS,
  TIME_CLASSES,
  type DatePreset,
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
  const { status, progress, stats, error, maxGames, scan, abort, reset } =
    useScanner();

  const [username] = useQueryState("u", parseAsString.withDefault(""));
  const [platform] = useQueryState(
    "p",
    parseAsStringLiteral(PLATFORMS).withDefault("chesscom"),
  );
  const [color] = useQueryState(
    "c",
    parseAsStringLiteral(SCAN_COLORS).withDefault("both"),
  );
  const [times] = useQueryState("tc", parseAsString.withDefault("blitz,rapid"));
  const [window] = useQueryState(
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

  const autoCollapsedRef = useRef(false);
  useEffect(() => {
    if (status === "running" && !autoCollapsedRef.current) {
      autoCollapsedRef.current = true;
      setExpanded(false);
    }
    if (status === "idle") autoCollapsedRef.current = false;
  }, [status]);

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
      <div className="min-h-screen flex flex-col bg-paper-dark">
        <Header onNewScan={newScan} />

        <div className="paper-texture animate-workspace-enter">
          <div className="mx-auto max-w-7xl px-4 py-6 space-y-5">
            <ScanSummaryBar
              running={status === "running"}
              progress={progress}
              stats={stats}
              username={username}
              platform={platform}
              color={color}
              timeClasses={timeClasses}
              window={window}
              expanded={expanded}
              onToggle={() => setExpanded((v) => !v)}
              onReset={newScan}
              onAbort={abort}
            />

            {expanded ? (
              <section className="rounded-xl border border-border bg-paper p-5 paper-inset animate-fade-up">
                <ScanForm
                  onSubmit={submit}
                  running={status === "running"}
                  onAbort={abort}
                />
              </section>
            ) : null}

            {status === "running" ? (
              <ScanProgress
                progress={progress}
                running
                expected={maxGames}
              />
            ) : null}

            {error ? (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
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
              <div className="rounded-xl border border-border bg-paper p-10 text-center text-sm text-ink-light paper-inset">
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

function LandingHero({
  onSubmit,
}: {
  onSubmit: (params: ScanParams) => void;
}) {
  const dict = useDictionary();
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="hero-bg paper-texture flex-1 flex flex-col items-center justify-center px-4 py-14">
        <div className="w-full max-w-3xl relative z-10">
          <div className="text-center mb-10 stagger-children">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-paper/80 px-3 py-1 text-xs text-ink-light">
              <Radar className="h-3.5 w-3.5 text-amber" />
              {dict.landing.badge}
            </div>
            <h1
              className="mt-4 text-5xl font-bold text-wood tracking-tight"
              style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
            >
              {dict.landing.h1}
            </h1>
            <p className="text-lg text-ink-light mt-3 leading-relaxed">
              {dict.landing.subtitle}
            </p>
          </div>

          <div className="bg-paper rounded-xl border border-border shadow-lg p-6 animate-scale-in paper-inset">
            <ScanForm onSubmit={onSubmit} running={false} onAbort={() => {}} />
          </div>

          <p className="text-center text-xs text-ink-light/60 mt-10">
            {dict.landing.footer}
          </p>
        </div>
      </div>
    </div>
  );
}

