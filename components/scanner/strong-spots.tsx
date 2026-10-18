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
  pathFilter: string[];
  onSelectOpening: (openingId: string) => void;
  onSelectVariation: (openingId: string, path: string[]) => void;
}

export function StrongSpots(props: StrongSpotsProps) {
  return (
    <SpotsPanel
      kind="strong"
      {...props}
      icon={TrendingUp}
      iconClassName="text-win"
      statClassName="text-win"
      hoverClassName="hover:border-line hover:bg-chip-active"
      computeOpenings={computeStrongOpenings}
      computeVariations={computeStrongVariations}
    />
  );
}
