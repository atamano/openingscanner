import type { PlayerColor } from "@/lib/sources/types";
import { CATALOG, type CatalogEntry } from "./openings";

/**
 * Classify a game by longest-prefix SAN match against the curated catalog.
 * Only entries whose `color` matches the side the player was on are eligible.
 * Returns the catalog entry id, or null when nothing matches.
 */
export function classifyGame(
  moves: readonly string[],
  playerColor: PlayerColor,
  catalog: readonly CatalogEntry[] = CATALOG,
): string | null {
  let best: { id: string; depth: number } | null = null;

  for (const entry of catalog) {
    if (entry.color !== playerColor) continue;
    if (entry.moves.length > moves.length) continue;

    let ok = true;
    for (let i = 0; i < entry.moves.length; i++) {
      if (moves[i] !== entry.moves[i]) {
        ok = false;
        break;
      }
    }
    if (!ok) continue;
    if (!best || entry.moves.length > best.depth) {
      best = { id: entry.id, depth: entry.moves.length };
    }
  }

  return best?.id ?? null;
}

/**
 * Determine on which side the player played for a given game.
 * Case-insensitive username match; returns null if the username isn't present.
 */
export function resolvePlayerColor(
  whiteName: string,
  blackName: string,
  username: string,
): PlayerColor | null {
  const u = username.trim().toLowerCase();
  if (whiteName.toLowerCase() === u) return "white";
  if (blackName.toLowerCase() === u) return "black";
  return null;
}
