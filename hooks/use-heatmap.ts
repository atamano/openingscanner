"use client";

import { useEffect, useState } from "react";
import type { EcoLookup } from "@/hooks/use-scanner";
import {
  buildHeatmap,
  heatmapEpds,
  labelHeatmap,
  type HeatmapCell,
} from "@/lib/heatmap/heatmap";
import type { MoveNode } from "@/lib/repertoire/aggregate";

/**
 * Build the board overlay for the candidates at the current position, with
 * their opening names resolved by the worker.
 *
 * Cells are published in one shot, already labelled. Publishing the unlabelled
 * pass first would fade an anonymous overlay in, then fade it straight back out
 * when the names landed — a visible double flash on every enable.
 */
export function useHeatmap(
  enabled: boolean,
  baseMoves: readonly string[],
  children: readonly MoveNode[],
  currentOpeningName: string | null,
  lookupEco: EcoLookup,
): HeatmapCell[] | null {
  const [cells, setCells] = useState<HeatmapCell[] | null>(null);

  useEffect(() => {
    if (!enabled) {
      setCells(null);
      return;
    }
    const base = buildHeatmap(baseMoves, children);
    if (base.length === 0) {
      setCells(null);
      return;
    }

    let cancelled = false;
    lookupEco(heatmapEpds(base))
      .then((labels) => {
        if (cancelled) return;
        setCells(labelHeatmap(base, labels, currentOpeningName));
      })
      .catch(() => {
        // The worker is the only thing that can fail here, and only by being
        // torn down mid-flight. Fall back to an unlabelled overlay: the
        // frequencies are the point, the names are the garnish.
        if (cancelled) return;
        setCells(base);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, baseMoves, children, currentOpeningName, lookupEco]);

  return cells;
}
