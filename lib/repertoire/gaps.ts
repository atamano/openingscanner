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
 * Two gates protect against off-repertoire suggestions like "you should learn
 * the Ruy Lopez" recommended to a French Defence player who happened to play
 * 1…e5 once by accident:
 *
 * 1. `match >= minMatch` ensures the recommendation extends a line the player
 *    has actually walked into. As White a 1-ply match is enough; as Black we
 *    need at least 2 plies (white's first move *and* the player's response,
 *    since picking 1…c5 vs 1…e5 is the actual repertoire choice).
 *
 * 2. `anchorCount >= anchorThreshold` is the volume gate on the *decision
 *    prefix*. A one-off `e4 e5` in a sea of `e4 e6` games has match=2 but
 *    anchorCount=1 — which the old code passed through. We now require the
 *    decision prefix to be backed by a meaningful chunk of the player's games:
 *    `max(3, ceil(2% of color-side games))`. Hard floor protects small samples;
 *    the percentage scales with volume so heavy players don't get noise.
 *
 * Ranking among survivors blends curated popularity with overlap depth.
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
  const minMatch = color === "white" ? 1 : 2;
  const colorGames = stats.colorBreakdown[color] ?? 0;
  const anchorThreshold = Math.max(3, Math.ceil(colorGames * 0.02));

  // Scoped panel: don't recommend variations under an opening the player has
  // barely touched. Without this the global anchor gate passes (1.e4 alone is
  // fat) while the scope itself might be a one-game accident.
  if (scope) {
    const scopePlayed = prefixCount.get(scope.join(" ")) ?? 0;
    if (scopePlayed < 3) return [];
  }

  const scored = CATALOG.filter((e) => {
    if (e.color !== color) return false;
    if (scope && !startsWith(e.moves, scope)) return false;
    if (scope && e.moves.length <= scopeLen) return false;
    return true;
  })
    .map((entry) => {
      const match = longestPrefixMatch(entry.moves, prefixCount);
      const familiar = prefixCount.get(entry.moves.join(" ")) ?? 0;
      // Volume on the decision prefix — for Black this is "how many games
      // started with the player's actual response to white's first move".
      const anchorPlies = Math.min(minMatch, entry.moves.length);
      const anchorKey = entry.moves.slice(0, anchorPlies).join(" ");
      const anchorCount = prefixCount.get(anchorKey) ?? 0;
      return { entry, match, familiar, anchorCount };
    })
    .filter(({ match, familiar, anchorCount }) => {
      if (match < minMatch) return false;
      if (anchorCount < anchorThreshold) return false;
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
