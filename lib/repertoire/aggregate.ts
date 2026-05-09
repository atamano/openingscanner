import { classifyByEco } from "@/lib/catalog/eco-classify";
import {
  UNCATEGORIZED_ID,
  type CatalogEntry,
} from "@/lib/catalog/openings";
import type {
  GameSummary,
  PartialOpeningSnapshot,
  Platform,
  PlayerColor,
  ScanSource,
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
  /** Display label for the player(s) — single source uses the bare handle, multi-source joins them with "+". */
  username: string;
  colorBreakdown: { white: number; black: number };
  byOpening: Record<string, OpeningStats>;
  /** Move tree from the initial position, per color. Precomputed in finalize. */
  globalTreeByColor: { white: MoveNode; black: MoveNode };
  /** False when raw games were stripped (e.g. on IDB rehydrate) — exports disabled. */
  gamesRetained: boolean;
}

export function createRepertoireAccumulator(
  sources: ScanSource[],
): RepertoireAccumulator {
  return new RepertoireAccumulator(sources);
}

type StatsWithRatedCount = OpeningStats & { _ratedCount?: number };

export class RepertoireAccumulator {
  public totalGames = 0;
  public totalClassified = 0;
  public byOpening: Record<string, OpeningStats> = {};
  public colorBreakdown = { white: 0, black: 0 };
  public readonly username: string;
  private globalTreeByColor = {
    white: emptyNode(""),
    black: emptyNode(""),
  };
  // Multiple accounts on the same platform are supported, so we keep a set
  // of lowercased handles per platform and check both seats of each game
  // against it. Older single-account code used resolvePlayerColor, but it
  // only takes one name — inlining the check lets the same accumulator
  // merge games from a player's main + secondary handles.
  private usernamesByPlatform: Partial<Record<Platform, Set<string>>>;

  constructor(sources: ScanSource[]) {
    this.usernamesByPlatform = {};
    for (const src of sources) {
      const set =
        this.usernamesByPlatform[src.platform] ?? new Set<string>();
      set.add(src.username.trim().toLowerCase());
      this.usernamesByPlatform[src.platform] = set;
    }
    this.username = sources.map((s) => s.username).join("+");
  }

  add(game: GameSummary): void {
    const set = this.usernamesByPlatform[game.platform];
    if (!set || set.size === 0) return;
    const w = game.white.name.toLowerCase();
    const b = game.black.name.toLowerCase();
    const isWhite = set.has(w);
    const isBlack = set.has(b);
    // Two of the player's accounts played each other. Skip — counting it
    // would either inflate stats (classify twice) or pick a side arbitrarily,
    // and a self-game has no opening-repertoire signal.
    if (isWhite && isBlack) return;
    const playerColor: PlayerColor | null = isWhite
      ? "white"
      : isBlack
        ? "black"
        : null;
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
      const s = stats as StatsWithRatedCount;
      const prev = s.avgOpponentRating ?? opponentRating;
      const prevCount = s._ratedCount ?? 0;
      const nextCount = prevCount + 1;
      s.avgOpponentRating = (prev * prevCount + opponentRating) / nextCount;
      s._ratedCount = nextCount;
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

    // Build the global-from-initial-position tree incrementally so finalize()
    // stays O(openings) instead of re-walking every game at the end.
    addGameToTree(
      this.globalTreeByColor[playerColor],
      game.moves,
      playerColor,
      game.result,
    );
  }

  finalize(): RepertoireStats {
    return {
      totalGames: this.totalGames,
      totalClassified: this.totalClassified,
      username: this.username,
      colorBreakdown: this.colorBreakdown,
      byOpening: this.byOpening,
      globalTreeByColor: this.globalTreeByColor,
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

export const TREE_DEPTH_LIMIT = 20;

/**
 * Filter game records to those whose continuation past `atPly` "lands" at
 * the given `path` in the per-opening tree — i.e. the game ended exactly
 * there or was truncated by `TREE_DEPTH_LIMIT` at that depth. Co-located
 * with `addGameToTree` so the depth cap + continuation basis can't drift
 * between the ingest and read paths.
 */
export function findGamesAtPath(
  games: readonly GameRecord[],
  path: readonly string[],
): GameRecord[] {
  const out: GameRecord[] = [];
  for (const rec of games) {
    const continuationLength = rec.game.moves.length - rec.atPly;
    const effectiveDepth = Math.min(continuationLength, TREE_DEPTH_LIMIT);
    if (effectiveDepth !== path.length) continue;
    let matches = true;
    for (let i = 0; i < path.length; i++) {
      if (rec.game.moves[rec.atPly + i] !== path[i]) {
        matches = false;
        break;
      }
    }
    if (matches) out.push(rec);
  }
  return out;
}

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
