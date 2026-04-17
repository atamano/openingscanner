import { CATALOG, type CatalogEntry } from "@/lib/catalog/openings";
import type { PlayerColor } from "@/lib/sources/types";
import type { RepertoireStats } from "./aggregate";

export interface GapRecommendation {
  entry: CatalogEntry;
  reason: string;
}

/**
 * Recommend curated openings the player barely explores on the given side.
 * Uses fuzzy name / family matching against the player's classified ECO
 * entries (the ECO taxonomy is exhaustive but doesn't carry "popularity",
 * so we keep the curated catalog as the preset list for this view).
 */
export function computeGaps(
  stats: RepertoireStats,
  color: PlayerColor,
  limit = 3,
): GapRecommendation[] {
  const played = Object.values(stats.byOpening).filter(
    (s) => s.entry?.color === color && s.gameCount >= 3,
  );

  const playedNames = played
    .map((s) => s.entry?.name.toLowerCase())
    .filter((n): n is string => Boolean(n));

  const playedFamilies = new Map<string, number>();
  for (const s of played) {
    if (!s.entry) continue;
    const fam = normalizeFamily(s.entry.family, s.entry.name);
    playedFamilies.set(fam, (playedFamilies.get(fam) ?? 0) + s.gameCount);
  }

  const candidates = CATALOG.filter((e) => {
    if (e.color !== color) return false;
    const needle = e.name.toLowerCase();
    // Skip if the player already plays something with the same name or family.
    if (playedNames.some((n) => n.includes(needle) || needle.includes(n))) {
      return false;
    }
    const fam = normalizeFamily(e.family, e.name);
    if ((playedFamilies.get(fam) ?? 0) >= 5) return false;
    return true;
  });

  const scored = candidates
    .map((entry) => {
      const fam = normalizeFamily(entry.family, entry.name);
      const familyPlayed = playedFamilies.get(fam) ?? 0;
      const familyPenalty = familyPlayed > 0 ? familyPlayed * 0.5 : -15;
      return { entry, score: entry.popularity - familyPenalty };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored.map(({ entry }) => ({
    entry,
    reason: playedFamilies.has(normalizeFamily(entry.family, entry.name))
      ? `Complement your ${entry.family} repertoire`
      : `You rarely explore ${entry.family}`,
  }));
}

function normalizeFamily(family: string, name: string): string {
  // Lichess ECO names look like "Sicilian Defense: Najdorf Variation".
  // The curated catalog uses "Sicilian" (short form). Normalise both.
  const first = (family || name.split(":")[0] || name).trim();
  return first.toLowerCase().replace(/\s+defense$/i, "");
}
