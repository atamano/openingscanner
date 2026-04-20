import { classifyByEco } from "@/lib/catalog/eco-classify";
import {
  UNCATEGORIZED_ID,
  type CatalogEntry,
} from "@/lib/catalog/openings";
import { resolvePlayerColor } from "@/lib/catalog/classify";
import type {
  GameSummary,
  PartialOpeningSnapshot,
  PlayerColor,
} from "@/lib/sources/types";

export interface MoveNode {
  san: string;
  count: number;
  playerWins: number;
  draws: number;
  playerLosses: number;
  children: Record<string, MoveNode>;
}

export interface GameRecord {
  game: GameSummary;
  playerColor: PlayerColor;
  /** Ply depth at which the ECO match landed for this specific game. */
  atPly: number;
}

export interface OpeningStats {
  openingId: string;
  entry: CatalogEntry | null;
  color: PlayerColor;
  gameCount: number;
  playerWins: number;
  playerLosses: number;
  draws: number;
  avgOpponentRating: number | null;
  lastPlayedAt: number;
  /** Player's own move tree starting FROM the ECO-classified position. */
  tree: MoveNode;
  /** Ply depth at which the ECO match was detected (for labelling). */
  classifiedAtPly: number;
  /** Raw games classified into this opening, kept for expert exports. */
  games: GameRecord[];
}

export interface RepertoireStats {
  totalGames: number;
  totalClassified: number;
  username: string;
  colorBreakdown: { white: number; black: number };
  byOpening: Record<string, OpeningStats>;
  /** Move tree from the initial position, per color. Precomputed in finalize. */
  globalTreeByColor: { white: MoveNode; black: MoveNode };
  /** False when raw games were stripped (e.g. on IDB rehydrate) — exports disabled. */
  gamesRetained: boolean;
}

export function createRepertoireAccumulator(
  username: string,
): RepertoireAccumulator {
  return new RepertoireAccumulator(username);
}

export class RepertoireAccumulator {
  public totalGames = 0;
  public totalClassified = 0;
  public byOpening: Record<string, OpeningStats> = {};
  public colorBreakdown = { white: 0, black: 0 };

  constructor(public readonly username: string) {}

  add(game: GameSummary): void {
    const playerColor = resolvePlayerColor(
      game.white.name,
      game.black.name,
      this.username,
    );
    if (!playerColor) return;

    this.totalGames++;
    this.colorBreakdown[playerColor]++;

    const match = classifyByEco(game.moves);
    const id = match
      ? `${match.epd}|${playerColor}`
      : `${UNCATEGORIZED_ID}|${playerColor}`;

    if (match) this.totalClassified++;

    let stats = this.byOpening[id];
    if (!stats) {
      stats = {
        openingId: id,
        entry: match ? ecoToEntry(match, playerColor) : null,
        color: playerColor,
        gameCount: 0,
        playerWins: 0,
        playerLosses: 0,
        draws: 0,
        avgOpponentRating: null,
        lastPlayedAt: 0,
        tree: emptyNode(""),
        classifiedAtPly: match ? match.atPly : 0,
        games: [],
      };
      this.byOpening[id] = stats;
    }

    stats.games.push({ game, playerColor, atPly: match ? match.atPly : 0 });

    stats.gameCount++;
    stats.lastPlayedAt = Math.max(stats.lastPlayedAt, game.date);

    const opponentRating =
      playerColor === "white" ? game.black.rating : game.white.rating;
    if (opponentRating) {
      const prev = stats.avgOpponentRating ?? opponentRating;
      const prevCount = (stats as unknown as { _ratedCount?: number })
        ._ratedCount ?? 0;
      const nextCount = prevCount + 1;
      stats.avgOpponentRating = (prev * prevCount + opponentRating) / nextCount;
      (stats as unknown as { _ratedCount?: number })._ratedCount = nextCount;
    }

    const playerWon = game.result === playerColor;
    const playerLost =
      (playerColor === "white" && game.result === "black") ||
      (playerColor === "black" && game.result === "white");
    if (playerWon) stats.playerWins++;
    else if (playerLost) stats.playerLosses++;
    else stats.draws++;

    // Store only the continuation of the player's moves PAST the ECO
    // match point, so transpositions converging at the same EPD share the
    // same subtree.
    const continuation = match
      ? game.moves.slice(match.atPly)
      : game.moves;
    addGameToTree(stats.tree, continuation, playerColor, game.result);
  }

  finalize(): RepertoireStats {
    const globalTreeByColor = {
      white: emptyNode(""),
      black: emptyNode(""),
    };
    for (const opening of Object.values(this.byOpening)) {
      const root = globalTreeByColor[opening.color];
      for (const rec of opening.games) {
        addGameToTree(root, rec.game.moves, rec.playerColor, rec.game.result);
      }
    }
    return {
      totalGames: this.totalGames,
      totalClassified: this.totalClassified,
      username: this.username,
      colorBreakdown: this.colorBreakdown,
      byOpening: this.byOpening,
      globalTreeByColor,
      gamesRetained: true,
    };
  }

  /**
   * Returns a small, plain-data snapshot of the current top-N openings so the
   * UI can preview the repertoire as it streams in. Skips uncategorized so the
   * preview stays meaningful — the long tail joins after the scan completes.
   */
  topOpenings(limit: number): PartialOpeningSnapshot[] {
    const entries: PartialOpeningSnapshot[] = [];
    for (const stats of Object.values(this.byOpening)) {
      if (!stats.entry) continue;
      entries.push({
        id: stats.openingId,
        name: stats.entry.name,
        family: stats.entry.family ?? null,
        eco: stats.entry.eco ?? null,
        color: stats.color,
        gameCount: stats.gameCount,
        wins: stats.playerWins,
        draws: stats.draws,
        losses: stats.playerLosses,
      });
    }
    entries.sort((a, b) => b.gameCount - a.gameCount);
    return entries.slice(0, limit);
  }
}

/**
 * Return the precomputed "first moves actually played" tree for a given color.
 * Kept as a helper so callers don't need to know it's just a property lookup,
 * and so rehydrated stats (where the field may be missing on old payloads)
 * degrade gracefully.
 */
export function buildGlobalTree(
  stats: RepertoireStats,
  color: PlayerColor,
): MoveNode {
  return stats.globalTreeByColor?.[color] ?? emptyNode("");
}

function ecoToEntry(
  match: { eco: string; name: string; family: string; moves: string[] },
  color: PlayerColor,
): CatalogEntry {
  return {
    id: `${match.eco}-${match.name}`,
    name: match.name,
    family: match.family,
    color,
    eco: match.eco,
    moves: match.moves,
    popularity: 0,
  };
}

function emptyNode(san: string): MoveNode {
  return {
    san,
    count: 0,
    playerWins: 0,
    draws: 0,
    playerLosses: 0,
    children: {},
  };
}

const TREE_DEPTH_LIMIT = 20;

function addGameToTree(
  root: MoveNode,
  moves: readonly string[],
  playerColor: PlayerColor,
  result: GameSummary["result"],
): void {
  let node = root;
  const depth = Math.min(moves.length, TREE_DEPTH_LIMIT);
  for (let i = 0; i < depth; i++) {
    const san = moves[i];
    let child = node.children[san];
    if (!child) {
      child = emptyNode(san);
      node.children[san] = child;
    }
    child.count++;
    if (result === playerColor) child.playerWins++;
    else if (result === "draw") child.draws++;
    else child.playerLosses++;
    node = child;
  }
}
