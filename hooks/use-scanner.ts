"use client";

import * as Comlink from "comlink";
import { useCallback, useEffect, useRef, useState } from "react";
import type { RepertoireStats } from "@/lib/repertoire/aggregate";
import type { ScanParams, ScanProgressEvent } from "@/lib/sources/types";
import {
  clearLastScan,
  loadLastScan,
  saveLastScan,
} from "@/lib/storage/dexie";
import type { ScannerAPI } from "@/workers/scanner.worker";

type ScanStatus = "idle" | "running" | "done" | "error";

export function useScanner() {
  const [status, setStatus] = useState<ScanStatus>("idle");
  const [progress, setProgress] = useState<ScanProgressEvent | null>(null);
  const [stats, setStats] = useState<RepertoireStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [maxGames, setMaxGames] = useState<number | undefined>(undefined);
  const [restored, setRestored] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  const apiRef = useRef<Comlink.Remote<ScannerAPI> | null>(null);
  const scanIdRef = useRef(0);
  const statusRef = useRef<ScanStatus>("idle");
  statusRef.current = status;

  useEffect(() => {
    const worker = new Worker(
      new URL("../workers/scanner.worker.ts", import.meta.url),
      { type: "module" },
    );
    workerRef.current = worker;
    apiRef.current = Comlink.wrap<ScannerAPI>(worker);
    return () => {
      worker.terminate();
      workerRef.current = null;
      apiRef.current = null;
    };
  }, []);

  // Rehydrate the most recent scan from IndexedDB so a refresh doesn't
  // discard the results. Runs once per mount, after paint.
  useEffect(() => {
    let cancelled = false;
    const idle = (cb: () => void) => {
      if (typeof requestIdleCallback === "function") {
        requestIdleCallback(cb);
      } else {
        setTimeout(cb, 0);
      }
    };
    idle(async () => {
      const saved = await loadLastScan();
      if (cancelled) return;
      if (saved && statusRef.current === "idle") {
        setStats(saved.stats);
        setMaxGames(saved.params.filters.maxGames);
        setStatus("done");
      }
      setRestored(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const scan = useCallback(async (params: ScanParams) => {
    if (!apiRef.current) return;
    const myId = ++scanIdRef.current;
    setStatus("running");
    setProgress({ fetched: 0, classified: 0, elapsedMs: 0 });
    setStats(null);
    setError(null);
    setMaxGames(params.filters.maxGames);

    const progressProxy: ((p: ScanProgressEvent) => void) &
      Comlink.ProxyMarked & { [Comlink.releaseProxy]: () => void } =
      Comlink.proxy((p: ScanProgressEvent) => {
        if (scanIdRef.current !== myId) return;
        setProgress(p);
      }) as never;
    try {
      const result = await apiRef.current.scan(params, progressProxy);
      if (scanIdRef.current !== myId) return;
      setStats(result.stats);
      if (result.error && result.stats.totalGames === 0) {
        setError(result.error);
        setStatus("error");
      } else {
        if (result.error) setError(result.error);
        setStatus("done");
        void saveLastScan({
          params,
          stats: result.stats,
          finishedAt: Date.now(),
        });
      }
    } catch (e) {
      if (scanIdRef.current !== myId) return;
      if ((e as Error).name === "AbortError") return;
      setError((e as Error).message || "Scan failed");
      setStatus("error");
    } finally {
      progressProxy[Comlink.releaseProxy]();
    }
  }, []);

  const abort = useCallback(() => {
    scanIdRef.current++;
    apiRef.current?.abort();
    setStatus("idle");
  }, []);

  const reset = useCallback(() => {
    scanIdRef.current++;
    apiRef.current?.abort();
    setStatus("idle");
    setProgress(null);
    setStats(null);
    setError(null);
    void clearLastScan();
  }, []);

  return {
    status,
    progress,
    stats,
    error,
    maxGames,
    restored,
    scan,
    abort,
    reset,
  };
}
