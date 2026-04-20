"use client";

import { AlertTriangle } from "lucide-react";
import type { OpeningStats, RepertoireStats } from "@/lib/repertoire/aggregate";
import {
  computeWeakOpenings,
  computeWeakVariations,
} from "@/lib/repertoire/weaknesses";
import type { PlayerColor } from "@/lib/sources/types";
import { SpotsPanel } from "./spots-panel";

interface WeakSpotsProps {
  stats: RepertoireStats;
  color: PlayerColor;
  selected: OpeningStats | null;
  onSelectOpening: (openingId: string) => void;
  onSelectVariation: (openingId: string, path: string[]) => void;
}

export function WeakSpots(props: WeakSpotsProps) {
  return (
    <SpotsPanel
      kind="weak"
      {...props}
      icon={AlertTriangle}
      iconClassName="text-rose-500"
      statClassName="text-rose-500"
      hoverClassName="hover:border-rose-500/60 hover:bg-rose-500/5"
      computeOpenings={computeWeakOpenings}
      computeVariations={computeWeakVariations}
    />
  );
}
