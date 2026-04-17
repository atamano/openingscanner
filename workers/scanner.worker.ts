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

let currentController: AbortController | null = null;

const api = {
  async scan(
    params: ScanParams,
    onProgress: ProgressCallback,
  ): Promise<RepertoireStats> {
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
      throw err;
    }

    await emit();
    return acc.finalize();
  },

  abort() {
    currentController?.abort();
  },
};

export type ScannerAPI = typeof api;

Comlink.expose(api);
