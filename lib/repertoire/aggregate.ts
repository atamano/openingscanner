import { classifyByEco } from "@/lib/catalog/eco-classify";
import {
  UNCATEGORIZED_ID,
  type CatalogEntry,
} from "@/lib/catalog/openings";
import { resolvePlayerColor } from "@/lib/catalog/classify";
import type { GameSummary, PlayerColor } from "@/lib/sources/types";

export interface MoveNode {
  san: string;
  count: number;
  playerWins: number;
  draws: number;
  playerLosses: number;
  children: Record<string, MoveNode>;
}

export interface OpeningStats {
  openingId: string;
  entry: CatalogEntry | null;
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
}

export interface RepertoireStats {
  totalGames: number;
  totalClassified: number;
  username: string;
  colorBreakdown: { white: number; black: number };
  byOpening: Record<string, OpeningStats>;
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
    const id = match ? `${match.epd}|${playerColor}` : UNCATEGORIZED_ID;

    if (match) this.totalClassified++;

    let stats = this.byOpening[id];
    if (!stats) {
      stats = {
        openingId: id,
        entry: match ? ecoToEntry(match, playerColor) : null,
        gameCount: 0,
        playerWins: 0,
        playerLosses: 0,
        draws: 0,
        avgOpponentRating: null,
        lastPlayedAt: 0,
        tree: emptyNode(""),
        classifiedAtPly: match ? match.atPly : 0,
      };
      this.byOpening[id] = stats;
    }

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
    return {
      totalGames: this.totalGames,
      totalClassified: this.totalClassified,
      username: this.username,
      colorBreakdown: this.colorBreakdown,
      byOpening: this.byOpening,
    };
  }
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
