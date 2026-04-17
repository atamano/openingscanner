import { isUncategorizedId } from "@/lib/catalog/openings";
import type { PlayerColor } from "@/lib/sources/types";
import type { MoveNode, OpeningStats, RepertoireStats } from "./aggregate";

export interface StrongOpening {
  stats: OpeningStats;
  winPct: number;
  lossPct: number;
  drawPct: number;
}

export interface StrongVariation {
  /** SAN moves from the ECO-matched position down to this node. */
  path: string[];
  count: number;
  winPct: number;
  lossPct: number;
  drawPct: number;
}

/**
 * Rank the player's own openings by best expected score on a given side.
 * Mirror of computeWeakOpenings — kept parallel so the two widgets evolve
 * together.
 */
export function computeStrongOpenings(
  stats: RepertoireStats,
  color: PlayerColor,
  limit = Number.MAX_SAFE_INTEGER,
  minGames = 5,
): StrongOpening[] {
  const rows = Object.values(stats.byOpening).filter(
    (s) =>
      !isUncategorizedId(s.openingId) &&
      s.color === color &&
      s.gameCount >= minGames,
  );

  const scored = rows.map((s) => ({
    stats: s,
    winPct: s.playerWins / s.gameCount,
    lossPct: s.playerLosses / s.gameCount,
    drawPct: s.draws / s.gameCount,
  }));

  // Highest expected score first (wins + 0.5·draws). Break ties with sample
  // size (more games = more reliable signal) and then higher win-rate.
  scored.sort((a, b) => {
    const scoreA = a.winPct + 0.5 * a.drawPct;
    const scoreB = b.winPct + 0.5 * b.drawPct;
    if (scoreA !== scoreB) return scoreB - scoreA;
    if (a.stats.gameCount !== b.stats.gameCount) {
      return b.stats.gameCount - a.stats.gameCount;
    }
    return b.winPct - a.winPct;
  });

  return scored.slice(0, limit);
}

/**
 * Walk an opening's tree and surface the best-performing lines. For strengths
 * we keep the *shallowest* qualifying node on each branch — once a line is
 * clearly good, showing every descendant that inherits the same score adds
 * noise without new information.
 */
const STRONG_VARIATION_SCORE_MIN = 0.6;

export function computeStrongVariations(
  opening: OpeningStats,
  limit = Number.MAX_SAFE_INTEGER,
  minGames = 3,
  maxDepth = 12,
): StrongVariation[] {
  const out: StrongVariation[] = [];

  const visit = (node: MoveNode, path: string[]) => {
    if (path.length > 0 && node.count >= minGames) {
      const winPct = node.playerWins / node.count;
      const drawPct = node.draws / node.count;
      const score = winPct + 0.5 * drawPct;
      if (score > STRONG_VARIATION_SCORE_MIN) {
        out.push({
          path: [...path],
          count: node.count,
          winPct,
          lossPct: node.playerLosses / node.count,
          drawPct,
        });
      }
    }
    if (path.length >= maxDepth) return;
    for (const child of Object.values(node.children)) {
      visit(child, [...path, child.san]);
    }
  };

  visit(opening.tree, []);

  // Drop descendants of qualifying ancestors: if a parent line already scores
  // well, its children inheriting that score aren't a new insight.
  const kept: StrongVariation[] = [];
  for (const v of out) {
    let dominated = false;
    for (const other of out) {
      if (other === v) continue;
      if (other.path.length >= v.path.length) continue;
      let isPrefix = true;
      for (let i = 0; i < other.path.length; i++) {
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

  // Descending expected score — best lines first. Ties broken by larger
  // sample size then higher win-rate.
  kept.sort((a, b) => {
    const scoreA = a.winPct + 0.5 * a.drawPct;
    const scoreB = b.winPct + 0.5 * b.drawPct;
    if (scoreA !== scoreB) return scoreB - scoreA;
    if (a.count !== b.count) return b.count - a.count;
    return b.winPct - a.winPct;
  });

  return kept.slice(0, limit);
}
