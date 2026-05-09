import type { PlayerColor } from "@/lib/sources/types";
import type { OpeningStats, RepertoireStats } from "./aggregate";
import {
  nodeAtPath,
  rankOpenings,
  rankVariations,
  type RankedOpening,
  type RankedVariation,
} from "./ranking";

export type StrongOpening = RankedOpening;
export type StrongVariation = RankedVariation;

/**
 * Rank the player's openings by best expected score on a given side.
 * Openings with score ≤ 0.5 are excluded so a given opening can only show
 * up in one of the two panels (split on break-even).
 */
export function computeStrongOpenings(
  stats: RepertoireStats,
  color: PlayerColor,
  limit = Number.MAX_SAFE_INTEGER,
  minGames = 5,
): StrongOpening[] {
  return rankOpenings(stats, color, "best", limit, minGames);
}

/**
 * Walk an opening's tree and surface the best-performing lines (expected
 * score > 0.6). The shallowest qualifying node on each branch wins — once a
 * line is clearly good, surfacing every descendant adds noise without info.
 *
 * `pathFilter` scopes the walk to the sub-tree at that path so the
 * "shallowest" rule is applied within the slice the user is looking at, not
 * across the whole opening.
 */
const STRONG_VARIATION_SCORE_MIN = 0.6;

export function computeStrongVariations(
  opening: OpeningStats,
  pathFilter: readonly string[] = [],
  limit = Number.MAX_SAFE_INTEGER,
  minGames = 3,
  maxDepth = 12,
): StrongVariation[] {
  const root = nodeAtPath(opening.tree, pathFilter);
  if (!root) return [];
  return rankVariations(root, "best", STRONG_VARIATION_SCORE_MIN, {
    basePath: pathFilter,
    limit,
    minGames,
    maxDepth,
  });
}
