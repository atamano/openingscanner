"use client";

import { AlertCircle, Radar } from "lucide-react";
import { parseAsBoolean, parseAsString, useQueryState } from "nuqs";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Header } from "@/components/layout/header";
import { Dashboard } from "@/components/scanner/dashboard";
import { PlayerDirectory } from "@/components/scanner/player-directory";
import { ScanForm } from "@/components/scanner/scan-form";
import { ScanProgress } from "@/components/scanner/scan-progress";
import { ScanSummaryBar } from "@/components/scanner/scan-summary-bar";
import { useScanner } from "@/hooks/use-scanner";
import { useDictionary } from "@/lib/i18n/context";
import type {
  Platform,
  ScanColor,
  ScanParams,
  TimeClass,
} from "@/lib/sources/types";

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

  const [username, setUsername] = useQueryState(
    "u",
    parseAsString.withDefault(""),
  );
  const [platform, setPlatform] = useQueryState(
    "p",
    parseAsString.withDefault("lichess"),
  );
  const [color] = useQueryState("c", parseAsString.withDefault("both"));
  const [times] = useQueryState("tc", parseAsString.withDefault("blitz,rapid"));
  const [window] = useQueryState("d", parseAsString.withDefault("1y"));
  const [rated] = useQueryState("rated", parseAsBoolean.withDefault(true));
  const timeClasses = times ? times.split(",").filter(Boolean) : [];

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

  const submit = (params: ScanParams) => {
    scan(params);
    setExpanded(false);
  };

  const newScan = () => {
    reset();
    setExpanded(true);
  };

  // Click-through from the Popular players directory: sync the URL state
  // (so the form reflects the picked player) and immediately trigger the
  // scan using the current filter preferences.
  const quickScan = useCallback(
    (nextUsername: string, nextPlatform: Platform) => {
      setUsername(nextUsername);
      setPlatform(nextPlatform);
      const since = datePresetToSince(window);
      submit({
        platform: nextPlatform,
        username: nextUsername,
        filters: {
          color: color as ScanColor,
          ratedOnly: rated,
          timeClasses: timeClasses as TimeClass[],
          since,
          maxGames: 2000,
        },
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [color, rated, timeClasses.join(","), window],
  );

  if (!started) {
    return <LandingHero onSubmit={submit} onQuickScan={quickScan} />;
  }

  return (
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
  );
}

function LandingHero({
  onSubmit,
  onQuickScan,
}: {
  onSubmit: (params: ScanParams) => void;
  onQuickScan: (username: string, platform: Platform) => void;
}) {
  const dict = useDictionary();
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="hero-bg paper-texture flex-1 flex flex-col items-center justify-center px-4 py-14">
        <div className="w-full max-w-6xl relative z-10">
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

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
            <div className="bg-paper rounded-xl border border-border shadow-lg p-6 animate-scale-in paper-inset">
              <ScanForm
                onSubmit={onSubmit}
                running={false}
                onAbort={() => {}}
              />
            </div>
            <div className="min-h-[520px] lg:h-[600px] animate-scale-in">
              <PlayerDirectory onPick={onQuickScan} />
            </div>
          </div>

          <p className="text-center text-xs text-ink-light/60 mt-10">
            {dict.landing.footer}
          </p>
        </div>
      </div>
    </div>
  );
}

function datePresetToSince(preset: string): number | undefined {
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
