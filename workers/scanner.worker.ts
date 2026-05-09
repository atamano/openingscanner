/// <reference lib="webworker" />
import * as Comlink from "comlink";
import { streamChessComGames } from "@/lib/sources/chesscom";
import { streamLichessGames } from "@/lib/sources/lichess";
import {
  createRepertoireAccumulator,
  type RepertoireStats,
} from "@/lib/repertoire/aggregate";
import type {
  GameSummary,
  ScanFilters,
  ScanParams,
  ScanProgressEvent,
  ScanSource,
} from "@/lib/sources/types";

type ProgressCallback = (p: ScanProgressEvent) => void | Promise<void>;

export interface ScanResult {
  stats: RepertoireStats;
  /** Present when the scan failed mid-stream. Stats are still partial. */
  error?: string;
}

let currentController: AbortController | null = null;

function streamForSource(
  source: ScanSource,
  filters: ScanFilters,
  onLabel: (label: string) => void,
  onWarn: (msg: string) => void,
  signal: AbortSignal,
): AsyncGenerator<GameSummary> {
  if (source.platform === "lichess") {
    return streamLichessGames(source.username, filters, undefined, signal);
  }
  return streamChessComGames(
    source.username,
    filters,
    onLabel,
    signal,
    onWarn,
  );
}

const api = {
  async scan(
    params: ScanParams,
    onProgress: ProgressCallback,
  ): Promise<ScanResult> {
    currentController?.abort();
    const controller = new AbortController();
    currentController = controller;

    const acc = createRepertoireAccumulator(params.sources);
    const start = Date.now();
    let currentLabel: string | undefined;
    let fetched = 0;

    const emit = async () => {
      try {
        await onProgress({
          fetched,
          classified: acc.totalClassified,
          elapsedMs: Date.now() - start,
          currentLabel,
          topOpenings: acc.topOpenings(8),
        });
      } catch {
        // proxy may close; ignore
      }
    };

    // Parallel across platforms (chess.com + lichess hit different hosts so
    // they don't share rate limits), sequential within a platform so multiple
    // accounts on the same host queue politely. The maxGames cap is shared
    // across both streams; whichever stream first crosses it aborts the
    // controller so the sibling cancels its in-flight fetch instead of
    // wasting it. Slight overshoot is accepted (acc.add runs before the
    // check on the trailing iteration).
    const ccSources = params.sources.filter((s) => s.platform === "chesscom");
    const liSources = params.sources.filter((s) => s.platform === "lichess");

    const sourceErrors: string[] = [];
    let topLevelError: string | undefined;
    // Internal abort flag distinct from user-aborted: lets us tell apart
    // "cap reached" from "user clicked stop" when re-throwing.
    let capHit = false;

    // Errors carry the source handle so multi-account scans can tell two
    // failing lichess (or chess.com) handles apart.
    const sourceLabel = (src: ScanSource) =>
      `${src.platform === "lichess" ? "Lichess" : "Chess.com"} (${src.username})`;

    const runPlatform = async (sources: ScanSource[]): Promise<void> => {
      for (const src of sources) {
        if (controller.signal.aborted) return;
        currentLabel = src.platform === "lichess" ? "Lichess" : "Chess.com";
        await emit();
        try {
          const gen = streamForSource(
            src,
            params.filters,
            (label) => {
              currentLabel = label;
            },
            (msg) => {
              sourceErrors.push(`${sourceLabel(src)}: ${msg}`);
            },
            controller.signal,
          );
          for await (const game of gen) {
            fetched++;
            acc.add(game);
            if (
              params.filters.maxGames &&
              fetched >= params.filters.maxGames
            ) {
              capHit = true;
              controller.abort();
              return;
            }
            if (fetched % 25 === 0) await emit();
          }
        } catch (err) {
          if ((err as Error).name === "AbortError") return;
          sourceErrors.push(
            `${sourceLabel(src)}: ${(err as Error).message || "failed"}`,
          );
        }
      }
    };

    try {
      await Promise.all([runPlatform(ccSources), runPlatform(liSources)]);
      if (controller.signal.aborted && !capHit) {
        throw new DOMException("Scan aborted", "AbortError");
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        throw new DOMException("Scan aborted", "AbortError");
      }
      topLevelError = (err as Error).message || "Scan failed";
    }

    await emit();
    const release = (onProgress as unknown as { [Comlink.releaseProxy]?: () => void })[
      Comlink.releaseProxy
    ];
    release?.();
    // Combine top-level + per-source errors so neither hides the other.
    const error =
      [topLevelError, ...sourceErrors].filter(Boolean).join("; ") ||
      undefined;
    return error
      ? { stats: acc.finalize(), error }
      : { stats: acc.finalize() };
  },

  abort() {
    currentController?.abort();
  },
};

export type ScannerAPI = typeof api;

Comlink.expose(api);
