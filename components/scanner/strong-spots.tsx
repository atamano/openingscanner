"use client";

import { TrendingUp } from "lucide-react";
import type { OpeningStats, RepertoireStats } from "@/lib/repertoire/aggregate";
import {
  computeStrongOpenings,
  computeStrongVariations,
} from "@/lib/repertoire/strengths";
import type { PlayerColor } from "@/lib/sources/types";
import { SpotsPanel } from "./spots-panel";

interface StrongSpotsProps {
  stats: RepertoireStats;
  color: PlayerColor;
  selected: OpeningStats | null;
  onSelectOpening: (openingId: string) => void;
  onSelectVariation: (openingId: string, path: string[]) => void;
}

export function StrongSpots(props: StrongSpotsProps) {
  return (
    <SpotsPanel
      kind="strong"
      {...props}
      icon={TrendingUp}
      iconClassName="text-emerald-500"
      statClassName="text-emerald-500"
      hoverClassName="hover:border-emerald-500/60 hover:bg-emerald-500/5"
      computeOpenings={computeStrongOpenings}
      computeVariations={computeStrongVariations}
    />
  );
}
