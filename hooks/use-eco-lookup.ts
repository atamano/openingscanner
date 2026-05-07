"use client";

import { useEffect, useState } from "react";

export interface EcoLookupResult {
  name: string;
  family: string;
}

export type EcoLookup = (epd: string) => EcoLookupResult | null;

/**
 * Lazy-load the ECO catalog (~800kB module) only when the caller needs it,
 * e.g. when the heatmap toggle is first flipped on. Subsequent calls return
 * the cached lookup synchronously via the bundler's module cache.
 */
export function useEcoLookup(enabled: boolean): EcoLookup | null {
  const [lookup, setLookup] = useState<EcoLookup | null>(null);

  useEffect(() => {
    if (!enabled || lookup) return;
    let cancelled = false;
    import("@/lib/catalog/eco-data").then(({ ECO_BY_EPD }) => {
      if (cancelled) return;
      setLookup(() => (epd: string) => {
        const rec = ECO_BY_EPD[epd];
        return rec ? { name: rec.name, family: rec.family } : null;
      });
    });
    return () => {
      cancelled = true;
    };
  }, [enabled, lookup]);

  return lookup;
}
