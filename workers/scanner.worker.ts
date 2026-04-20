/// <reference lib="webworker" />
import * as Comlink from "comlink";
import { streamChessComGames } from "@/lib/sources/chesscom";
import { streamLichessGames } from "@/lib/sources/lichess";
import {
  createRepertoireAccumulator,
  type RepertoireStats,
} from "@/lib/repertoire/aggregate";
import type { ScanParams, ScanProgressEvent } from "@/lib/sources/types";

type ProgressCallback = (p: ScanProgressEvent) => void | Promise<void>;

export interface ScanResult {
  stats: RepertoireStats;
  /** Present when the scan failed mid-stream. Stats are still partial. */
  error?: string;
}

let currentController: AbortController | null = null;

const api = {
  async scan(
    params: ScanParams,
    onProgress: ProgressCallback,
  ): Promise<ScanResult> {
    currentController?.abort();
    const controller = new AbortController();
    currentController = controller;

    const acc = createRepertoireAccumulator(params.username);
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

    const iterator =
      params.platform === "lichess"
        ? streamLichessGames(
            params.username,
            params.filters,
            undefined,
            controller.signal,
          )
        : streamChessComGames(
            params.username,
            params.filters,
            (label) => {
              currentLabel = label;
            },
            controller.signal,
          );

    let partialError: string | undefined;
    try {
      for await (const game of iterator) {
        fetched++;
        acc.add(game);
        if (fetched % 25 === 0) await emit();
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        throw new DOMException("Scan aborted", "AbortError");
      }
      partialError = (err as Error).message || "Scan failed";
    }

    await emit();
    return partialError
      ? { stats: acc.finalize(), error: partialError }
      : { stats: acc.finalize() };
  },

  abort() {
    currentController?.abort();
  },
};

export type ScannerAPI = typeof api;

Comlink.expose(api);
