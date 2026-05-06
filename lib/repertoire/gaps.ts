import { CATALOG, type CatalogEntry } from "@/lib/catalog/openings";
import type { PlayerColor } from "@/lib/sources/types";
import type { RepertoireStats } from "./aggregate";

export type GapReason =
  | { kind: "played"; count: number }
  | { kind: "rare"; family: string };

export interface GapRecommendation {
  entry: CatalogEntry;
  reason: GapReason;
}

export interface GapOptions {
  /**
   * When set, only return curated entries whose move sequence starts with this
   * prefix (and goes deeper). Used to narrow "Worth exploring" to variations
   * of the currently-selected opening instead of the whole repertoire.
   */
  scopePrefix?: readonly string[];
}

const FAMILIAR_THRESHOLD = 5;

/**
 * Recommend curated openings that fit what the player already plays.
 *
 * The previous version surfaced popular openings the player had never touched
 * — which produced suggestions from totally different repertoires (e.g.
 * recommending the London System to a 1.e4 player). The fix: require move
 * overlap with games the player has actually played. As White that means the
 * recommendation must share at least the first move; as Black it must share
 * white's first move *and* the player's response, since "the player faced
 * 1.e4" alone isn't a repertoire choice — picking 1…c5 vs 1…e5 is.
 *
 * Among entries that pass the overlap gate we rank by a blend of curated
 * popularity and how deep the overlap goes — deeper matches are stronger
 * signals that the recommendation extends a line the player commits to.
 */
export function computeGaps(
  stats: RepertoireStats,
  color: PlayerColor,
  limit = 3,
  options: GapOptions = {},
): GapRecommendation[] {
  const played = Object.values(stats.byOpening).filter(
    (s) => s.color === color && s.entry !== null && s.gameCount >= 1,
  );

  const prefixCount = new Map<string, number>();
  for (const s of played) {
    if (!s.entry) continue;
    const moves = s.entry.moves;
    for (let i = 1; i <= moves.length; i++) {
      const key = moves.slice(0, i).join(" ");
      prefixCount.set(key, (prefixCount.get(key) ?? 0) + s.gameCount);
    }
  }

  const scope = options.scopePrefix;
  const scopeLen = scope?.length ?? 0;
  // Black entries are anchored at white's first move, so a 1-ply match means
  // only "the player has faced this opening" — not "the player chose this
  // defence". Require both halves of the first exchange to overlap.
  const minMatch = color === "white" ? 1 : 2;

  const scored = CATALOG.filter((e) => {
    if (e.color !== color) return false;
    if (scope && !startsWith(e.moves, scope)) return false;
    if (scope && e.moves.length <= scopeLen) return false;
    return true;
  })
    .map((entry) => {
      const match = longestPrefixMatch(entry.moves, prefixCount);
      const familiar = prefixCount.get(entry.moves.join(" ")) ?? 0;
      return { entry, match, familiar };
    })
    .filter(({ match, familiar }) => {
      if (match < minMatch) return false;
      if (familiar >= FAMILIAR_THRESHOLD) return false;
      return true;
    })
    .map((row) => ({
      ...row,
      score: row.entry.popularity + row.match * 5 - row.familiar * 3,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored.map(({ entry, familiar }) => ({
    entry,
    reason:
      familiar > 0
        ? ({ kind: "played", count: familiar } as const)
        : ({ kind: "rare", family: entry.family } as const),
  }));
}

function longestPrefixMatch(
  moves: readonly string[],
  prefixCount: Map<string, number>,
): number {
  let depth = 0;
  for (let i = 1; i <= moves.length; i++) {
    const key = moves.slice(0, i).join(" ");
    if ((prefixCount.get(key) ?? 0) > 0) depth = i;
    else break;
  }
  return depth;
}

function startsWith(moves: readonly string[], prefix: readonly string[]): boolean {
  if (moves.length < prefix.length) return false;
  for (let i = 0; i < prefix.length; i++) {
    if (moves[i] !== prefix[i]) return false;
  }
  return true;
}
