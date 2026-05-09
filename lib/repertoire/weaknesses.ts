import type { PlayerColor } from "@/lib/sources/types";
import type { OpeningStats, RepertoireStats } from "./aggregate";
import {
  rankOpenings,
  rankVariations,
  type RankedOpening,
  type RankedVariation,
} from "./ranking";

export type WeakOpening = RankedOpening;
export type WeakVariation = RankedVariation;

/**
 * Rank the player's openings by poorest expected score on a given side.
 * Openings with score ≥ 0.5 are excluded so a given opening can only show
 * up in one of the two panels (split on break-even).
 */
export function computeWeakOpenings(
  stats: RepertoireStats,
  color: PlayerColor,
  limit = Number.MAX_SAFE_INTEGER,
  minGames = 5,
): WeakOpening[] {
  return rankOpenings(stats, color, "worst", limit, minGames);
}

/**
 * Walk an opening's tree and surface the worst-performing lines (expected
 * score < 0.45). When a parent and a descendant both qualify, the descendant
 * is kept — it isolates where the player actually falls apart, since the
 * parent's score is just the weighted average of its children.
 */
const WEAK_VARIATION_SCORE_MAX = 0.45;

export function computeWeakVariations(
  opening: OpeningStats,
  limit = Number.MAX_SAFE_INTEGER,
  minGames = 3,
  maxDepth = 12,
): WeakVariation[] {
  return rankVariations(
    opening,
    "worst",
    WEAK_VARIATION_SCORE_MAX,
    limit,
    minGames,
    maxDepth,
  );
}
