import { CATALOG, type CatalogEntry } from "@/lib/catalog/openings";
import type { PlayerColor } from "@/lib/sources/types";
import type { RepertoireStats } from "./aggregate";

export interface GapRecommendation {
  entry: CatalogEntry;
  reason: string;
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
 * Recommend curated openings the player barely explores on the given side.
 *
 * The curated catalog and the ECO catalog have incompatible taxonomies
 * (curated family "vs 1.e4" vs ECO family "Italian Game"/"Ruy Lopez"/…), so
 * we can't compare by name or family. The only vocabulary both sides share
 * is the move sequence: every classified opening's `entry.moves` starts from
 * move 1, and every curated entry is defined as a move prefix. So: a curated
 * entry is "covered" iff any played opening's moves start with its prefix.
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

  const scored = CATALOG.filter((e) => {
    if (e.color !== color) return false;
    if (scope && !startsWith(e.moves, scope)) return false;
    if (scope && e.moves.length <= scopeLen) return false;
    return true;
  })
    .map((entry) => {
      const familiar = prefixCount.get(entry.moves.join(" ")) ?? 0;
      return { entry, familiar };
    })
    .filter(({ familiar }) => familiar < FAMILIAR_THRESHOLD)
    .map(({ entry, familiar }) => {
      const penalty = familiar > 0 ? familiar * 2 : -15;
      return { entry, familiar, score: entry.popularity - penalty };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored.map(({ entry, familiar }) => ({
    entry,
    reason:
      familiar > 0
        ? `You've played this ${familiar} time${familiar > 1 ? "s" : ""}`
        : `You rarely explore ${entry.family}`,
  }));
}

function startsWith(moves: readonly string[], prefix: readonly string[]): boolean {
  if (moves.length < prefix.length) return false;
  for (let i = 0; i < prefix.length; i++) {
    if (moves[i] !== prefix[i]) return false;
  }
  return true;
}
