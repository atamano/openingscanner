import { isUncategorizedId } from "@/lib/catalog/openings";
import type { PlayerColor } from "@/lib/sources/types";
import type { MoveNode, OpeningStats, RepertoireStats } from "./aggregate";

export interface RankedOpening {
  stats: OpeningStats;
  winPct: number;
  lossPct: number;
  drawPct: number;
}

export interface RankedVariation {
  /** SAN moves from the ECO-matched position down to this node. */
  path: string[];
  count: number;
  winPct: number;
  lossPct: number;
  drawPct: number;
}

/**
 * `best`: above-break-even score, surface the *shallowest* qualifying line so
 *  inheritors don't add noise.
 * `worst`: below-break-even score, surface the *deepest* qualifying line so
 *  parents that average their bad children don't crowd the panel.
 */
export type RankingDirection = "best" | "worst";

const BREAK_EVEN = 0.5;

export function rankOpenings(
  stats: RepertoireStats,
  color: PlayerColor,
  direction: RankingDirection,
  limit = Number.MAX_SAFE_INTEGER,
  minGames = 5,
): RankedOpening[] {
  const scored: RankedOpening[] = [];
  for (const s of Object.values(stats.byOpening)) {
    if (isUncategorizedId(s.openingId)) continue;
    if (s.color !== color) continue;
    if (s.gameCount < minGames) continue;
    const winPct = s.playerWins / s.gameCount;
    const lossPct = s.playerLosses / s.gameCount;
    const drawPct = s.draws / s.gameCount;
    const score = winPct + 0.5 * drawPct;
    if (direction === "best" ? score <= BREAK_EVEN : score >= BREAK_EVEN) {
      continue;
    }
    scored.push({ stats: s, winPct, lossPct, drawPct });
  }
  scored.sort(compareOpenings(direction));
  return scored.slice(0, limit);
}

export interface RankVariationsOptions {
  /**
   * Moves prepended to each emitted `path`. Used when ranking from a sub-tree
   * (the path filter on the dashboard) so emitted paths stay anchored to the
   * opening's ECO root, not to the sub-tree's local root.
   */
  basePath?: readonly string[];
  limit?: number;
  minGames?: number;
  /** Maximum *relative* depth from `rootNode`. */
  maxDepth?: number;
}

/**
 * `rootNode` is the tree to walk. When the caller has navigated into a
 * sub-position via `basePath`, pass the descendant node + the basePath so
 * `pruneByDomination` evaluates "shallowest qualifying" within the sub-tree
 * (otherwise an ancestor scored on a different sibling would silently drop
 * everything in this branch).
 */
export function rankVariations(
  rootNode: MoveNode,
  direction: RankingDirection,
  scoreThreshold: number,
  options: RankVariationsOptions = {},
): RankedVariation[] {
  const {
    basePath = [],
    limit = Number.MAX_SAFE_INTEGER,
    minGames = 3,
    maxDepth = 12,
  } = options;
  const out: RankedVariation[] = [];

  const visit = (node: MoveNode, relativePath: string[]) => {
    if (relativePath.length > 0 && node.count >= minGames) {
      const winPct = node.playerWins / node.count;
      const drawPct = node.draws / node.count;
      const score = winPct + 0.5 * drawPct;
      const qualifies =
        direction === "best"
          ? score > scoreThreshold
          : score < scoreThreshold;
      if (qualifies) {
        out.push({
          path: [...basePath, ...relativePath],
          count: node.count,
          winPct,
          lossPct: node.playerLosses / node.count,
          drawPct,
        });
      }
    }
    if (relativePath.length >= maxDepth) return;
    for (const child of Object.values(node.children)) {
      visit(child, [...relativePath, child.san]);
    }
  };
  visit(rootNode, []);

  const kept = pruneByDomination(out, direction);
  kept.sort(compareVariations(direction));
  return kept.slice(0, limit);
}

/**
 * Walk a tree along `path` and return the descendant node, or null when the
 * path doesn't exist. Used to scope variation ranking to a sub-position.
 */
export function nodeAtPath(
  root: MoveNode,
  path: readonly string[],
): MoveNode | null {
  let node = root;
  for (const san of path) {
    const next = node.children[san];
    if (!next) return null;
    node = next;
  }
  return node;
}

/**
 * Drop branches whose ancestor / descendant already qualifies (so the panel
 * surfaces only the most-informative depth per line). O(n · maxDepth) using a
 * Set keyed by joined path — replaces the prior O(n²·d) pairwise scan.
 *
 * Same Set is used both ways:
 *   `best`  → drop v if ANY strict ancestor of v.path is in the set
 *   `worst` → drop v if ANY descendant of v.path is in the set; equivalent to
 *             "v.path is a strict prefix of some other path", which we detect
 *             by stuffing every strict prefix of every path into a "covered"
 *             set and checking membership.
 */
function pruneByDomination<T extends RankedVariation>(
  variations: T[],
  direction: RankingDirection,
): T[] {
  if (variations.length === 0) return variations;
  if (direction === "best") {
    const keys = new Set(variations.map((v) => v.path.join(" ")));
    return variations.filter((v) => {
      for (let i = 1; i < v.path.length; i++) {
        if (keys.has(v.path.slice(0, i).join(" "))) return false;
      }
      return true;
    });
  }
  const coveredAncestors = new Set<string>();
  for (const v of variations) {
    for (let i = 1; i < v.path.length; i++) {
      coveredAncestors.add(v.path.slice(0, i).join(" "));
    }
  }
  return variations.filter((v) => !coveredAncestors.has(v.path.join(" ")));
}

function compareOpenings(direction: RankingDirection) {
  return (a: RankedOpening, b: RankedOpening) => {
    const scoreA = a.winPct + 0.5 * a.drawPct;
    const scoreB = b.winPct + 0.5 * b.drawPct;
    if (scoreA !== scoreB) {
      return direction === "best" ? scoreB - scoreA : scoreA - scoreB;
    }
    if (a.stats.gameCount !== b.stats.gameCount) {
      return b.stats.gameCount - a.stats.gameCount;
    }
    return direction === "best"
      ? b.winPct - a.winPct
      : b.lossPct - a.lossPct;
  };
}

function compareVariations(direction: RankingDirection) {
  return (a: RankedVariation, b: RankedVariation) => {
    const scoreA = a.winPct + 0.5 * a.drawPct;
    const scoreB = b.winPct + 0.5 * b.drawPct;
    if (scoreA !== scoreB) {
      return direction === "best" ? scoreB - scoreA : scoreA - scoreB;
    }
    if (a.count !== b.count) return b.count - a.count;
    return direction === "best" ? b.winPct - a.winPct : b.lossPct - a.lossPct;
  };
}
