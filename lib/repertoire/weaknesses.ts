import { UNCATEGORIZED_ID } from "@/lib/catalog/openings";
import type { PlayerColor } from "@/lib/sources/types";
import type { MoveNode, OpeningStats, RepertoireStats } from "./aggregate";

export interface WeakOpening {
  stats: OpeningStats;
  winPct: number;
  lossPct: number;
  drawPct: number;
}

export interface WeakVariation {
  /** SAN moves from the ECO-matched position down to this node. */
  path: string[];
  count: number;
  winPct: number;
  lossPct: number;
  drawPct: number;
}

/**
 * Rank the player's own openings by poorest score on a given side.
 * Only openings with enough games to be meaningful are considered.
 */
export function computeWeakOpenings(
  stats: RepertoireStats,
  color: PlayerColor,
  limit = Number.MAX_SAFE_INTEGER,
  minGames = 5,
): WeakOpening[] {
  const rows = Object.values(stats.byOpening).filter(
    (s) =>
      s.openingId !== UNCATEGORIZED_ID &&
      s.entry?.color === color &&
      s.gameCount >= minGames,
  );

  const scored = rows.map((s) => ({
    stats: s,
    winPct: s.playerWins / s.gameCount,
    lossPct: s.playerLosses / s.gameCount,
    drawPct: s.draws / s.gameCount,
  }));

  // Lowest win-rate first; break ties with sample size (more games = more
  // reliable signal) and then higher loss-rate.
  scored.sort((a, b) => {
    if (a.winPct !== b.winPct) return a.winPct - b.winPct;
    if (a.stats.gameCount !== b.stats.gameCount) {
      return b.stats.gameCount - a.stats.gameCount;
    }
    return b.lossPct - a.lossPct;
  });

  return scored.slice(0, limit);
}

/**
 * Walk an opening's tree and surface the worst-performing lines. Only nodes
 * with at least `minGames` games are kept so we're not ranking statistical
 * noise from one-off blunders.
 */
export function computeWeakVariations(
  opening: OpeningStats,
  limit = Number.MAX_SAFE_INTEGER,
  minGames = 4,
  maxDepth = 12,
): WeakVariation[] {
  const out: WeakVariation[] = [];

  const visit = (node: MoveNode, path: string[]) => {
    if (path.length > 0 && node.count >= minGames) {
      out.push({
        path: [...path],
        count: node.count,
        winPct: node.playerWins / node.count,
        lossPct: node.playerLosses / node.count,
        drawPct: node.draws / node.count,
      });
    }
    if (path.length >= maxDepth) return;
    for (const child of Object.values(node.children)) {
      visit(child, [...path, child.san]);
    }
  };

  visit(opening.tree, []);

  // Keep the deepest branch per move-prefix: if a parent AND its child both
  // qualify, the child better isolates where the player actually falls apart.
  // (Parent's win-rate is a weighted average that includes the child.)
  const byPrefix = new Map<string, WeakVariation>();
  const key = (p: string[]) => p.join(" ");
  for (const v of out) byPrefix.set(key(v.path), v);
  const kept: WeakVariation[] = [];
  for (const v of out) {
    let dominated = false;
    for (const other of out) {
      if (other === v) continue;
      if (other.path.length <= v.path.length) continue;
      // Is `other` a descendant of `v` that also qualifies? If so, `v` gets
      // dropped — we surface the deeper, more specific line.
      let isPrefix = true;
      for (let i = 0; i < v.path.length; i++) {
        if (other.path[i] !== v.path[i]) {
          isPrefix = false;
          break;
        }
      }
      if (isPrefix) {
        dominated = true;
        break;
      }
    }
    if (!dominated) kept.push(v);
  }

  kept.sort((a, b) => {
    if (a.winPct !== b.winPct) return a.winPct - b.winPct;
    if (a.count !== b.count) return b.count - a.count;
    return b.lossPct - a.lossPct;
  });

  return kept.slice(0, limit);
}
