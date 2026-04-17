"use client";

import { AlertCircle, Radar } from "lucide-react";
import { parseAsString, useQueryState } from "nuqs";
import { Suspense, useEffect, useRef, useState } from "react";
import { Dashboard } from "@/components/scanner/dashboard";
import { ScanForm } from "@/components/scanner/scan-form";
import { ScanProgress } from "@/components/scanner/scan-progress";
import { ScanSummaryBar } from "@/components/scanner/scan-summary-bar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useLichessAuth } from "@/hooks/use-lichess-auth";
import { useScanner } from "@/hooks/use-scanner";
import type { ScanParams } from "@/lib/sources/types";

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <HomeInner />
    </Suspense>
  );
}

function HomeInner() {
  const { token } = useLichessAuth();
  const { status, progress, stats, error, scan, abort, reset } = useScanner();

  // Read the current filter state from the URL so the summary bar can echo it.
  const [username] = useQueryState("u", parseAsString.withDefault(""));
  const [platform] = useQueryState("p", parseAsString.withDefault("lichess"));
  const [color] = useQueryState("c", parseAsString.withDefault("both"));
  const [times] = useQueryState("tc", parseAsString.withDefault("blitz,rapid"));
  const [window] = useQueryState("d", parseAsString.withDefault("1y"));
  const timeClasses = times ? times.split(",").filter(Boolean) : [];

  const started = status !== "idle";
  const [expanded, setExpanded] = useState(false);

  // Auto-collapse the form the first time a scan starts, but respect manual toggles after.
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

  return (
    <div className="space-y-6">
      {started ? (
        <>
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
            <section className="rounded-xl border bg-card/70 p-5 backdrop-blur">
              <ScanForm
                onSubmit={submit}
                lichessToken={token}
                running={status === "running"}
                onAbort={abort}
              />
            </section>
          ) : null}

          {status === "running" ? (
            <ScanProgress progress={progress} running />
          ) : null}
        </>
      ) : (
        <section className="relative overflow-hidden rounded-3xl border bg-card/70 backdrop-blur">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 -top-40 h-80 bg-[radial-gradient(ellipse_at_top,_var(--primary)_0%,_transparent_60%)] opacity-20"
          />
          <div className="relative grid gap-8 p-6 md:grid-cols-[minmax(0,1fr)_auto] md:p-10">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border bg-background/80 px-3 py-1 text-xs text-muted-foreground">
                <Radar className="size-3.5 text-primary" />
                Scan &amp; classify online games against a curated opening catalog
              </div>
              <h1 className="text-balance text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
                What openings does any player actually play?
              </h1>
              <p className="max-w-xl text-pretty text-muted-foreground">
                Stream a Lichess or Chess.com player's games in your browser,
                classify them against ~40 popular openings, and drill into the
                most-played lines. Everything runs client-side — no data leaves
                your machine.
              </p>
            </div>
          </div>

          <div className="border-t bg-background/30 p-6 backdrop-blur md:p-10">
            <ScanForm
              onSubmit={submit}
              lichessToken={token}
              running={false}
              onAbort={abort}
            />
          </div>
        </section>
      )}

      {error ? (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardHeader className="flex-row items-start gap-3 space-y-0">
            <AlertCircle className="mt-0.5 size-4 text-destructive" />
            <div>
              <CardTitle className="text-destructive">Scan failed</CardTitle>
              <CardDescription>{error}</CardDescription>
            </div>
          </CardHeader>
        </Card>
      ) : null}

      {status === "done" && stats && stats.totalGames > 0 ? (
        <Dashboard stats={stats} />
      ) : null}

      {status === "done" && stats && stats.totalGames === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center text-sm text-muted-foreground">
            <p>No games matched the filters.</p>
            <p>
              Try widening the time-window, toggling rated-only off, or
              switching platform.
            </p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
