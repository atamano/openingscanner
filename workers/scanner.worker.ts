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
  signal: AbortSignal,
): AsyncGenerator<GameSummary> {
  if (source.platform === "lichess") {
    return streamLichessGames(source.username, filters, undefined, signal);
  }
  return streamChessComGames(source.username, filters, onLabel, signal);
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

    // Sequential per source, with per-source error isolation. The cap is the
    // total across sources so source order acts as priority — submitting the
    // form pushes chess.com first when both fields are filled. Breaking the
    // outer loop ends the for-await on the active generator, which triggers
    // its finally cleanup (e.g. lichess `reader.releaseLock`).
    const sourceErrors: string[] = [];
    let topLevelError: string | undefined;
    try {
      outer: for (const src of params.sources) {
        if (controller.signal.aborted) break;
        currentLabel = src.platform === "lichess" ? "Lichess" : "Chess.com";
        await emit();
        try {
          const gen = streamForSource(
            src,
            params.filters,
            (label) => {
              currentLabel = label;
            },
            controller.signal,
          );
          for await (const game of gen) {
            fetched++;
            acc.add(game);
            if (params.filters.maxGames && fetched >= params.filters.maxGames) {
              break outer;
            }
            if (fetched % 25 === 0) await emit();
          }
        } catch (err) {
          if ((err as Error).name === "AbortError") throw err;
          sourceErrors.push(
            `${src.platform}: ${(err as Error).message || "failed"}`,
          );
        }
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
    const error = topLevelError ?? (sourceErrors.length ? sourceErrors.join("; ") : undefined);
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
