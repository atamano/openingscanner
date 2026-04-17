"use client";

import * as Comlink from "comlink";
import { useCallback, useEffect, useRef, useState } from "react";
import type { RepertoireStats } from "@/lib/repertoire/aggregate";
import type { ScanParams, ScanProgressEvent } from "@/lib/sources/types";
import type { ScannerAPI } from "@/workers/scanner.worker";

type ScanStatus = "idle" | "running" | "done" | "error";

export function useScanner() {
  const [status, setStatus] = useState<ScanStatus>("idle");
  const [progress, setProgress] = useState<ScanProgressEvent | null>(null);
  const [stats, setStats] = useState<RepertoireStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const apiRef = useRef<Comlink.Remote<ScannerAPI> | null>(null);

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

  const scan = useCallback(async (params: ScanParams) => {
    if (!apiRef.current) return;
    setStatus("running");
    setProgress({ fetched: 0, classified: 0, elapsedMs: 0 });
    setStats(null);
    setError(null);

    try {
      const result = await apiRef.current.scan(
        params,
        Comlink.proxy((p: ScanProgressEvent) => setProgress(p)),
      );
      setStats(result);
      setStatus("done");
    } catch (e) {
      setError((e as Error).message || "Scan failed");
      setStatus("error");
    }
  }, []);

  const abort = useCallback(() => {
    apiRef.current?.abort();
    setStatus("idle");
  }, []);

  const reset = useCallback(() => {
    apiRef.current?.abort();
    setStatus("idle");
    setProgress(null);
    setStats(null);
    setError(null);
  }, []);

  return { status, progress, stats, error, scan, abort, reset };
}
