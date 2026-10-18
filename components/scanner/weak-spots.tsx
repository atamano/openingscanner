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
  pathFilter: string[];
  onSelectOpening: (openingId: string) => void;
  onSelectVariation: (openingId: string, path: string[]) => void;
}

export function WeakSpots(props: WeakSpotsProps) {
  return (
    <SpotsPanel
      kind="weak"
      {...props}
      icon={AlertTriangle}
      iconClassName="text-loss"
      statClassName="text-loss"
      hoverClassName="hover:border-line hover:bg-loss/5"
      computeOpenings={computeWeakOpenings}
      computeVariations={computeWeakVariations}
    />
  );
}
