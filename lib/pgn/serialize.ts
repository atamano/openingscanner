import type {
  GameRecord,
  MoveNode,
  OpeningStats,
} from "@/lib/repertoire/aggregate";
import type { GameSummary } from "@/lib/sources/types";

const RESULT_TAG: Record<GameSummary["result"], string> = {
  white: "1-0",
  black: "0-1",
  draw: "1/2-1/2",
};

/**
 * Build a multi-game PGN from an opening's aggregated tree. Each mainline
 * branch from the root down to a leaf becomes one chapter-friendly game.
 * This is lossy compared to the raw games (we emit synthesized PGNs), but
 * gives a compact repertoire file suitable for Lichess study import.
 */
export function serializeOpeningToPGN(
  stats: OpeningStats,
  username: string,
): string {
  const entry = stats.entry;
  const chapterName = entry?.name ?? "Repertoire";
  const lines: string[] = [];

  const branches = collectBranches(stats.tree);
  if (branches.length === 0) return "";

  for (const [idx, branch] of branches.entries()) {
    lines.push(`[Event "${chapterName} — ${username} repertoire"]`);
    lines.push(`[Site "repertoire-scanner"]`);
    lines.push(`[Date "${formatDate(Date.now())}"]`);
    lines.push(`[White "${username}"]`);
    lines.push(`[Black "Repertoire line #${idx + 1}"]`);
    lines.push(`[Result "*"]`);
    if (entry?.eco) lines.push(`[ECO "${entry.eco}"]`);
    if (entry) lines.push(`[Opening "${entry.name}"]`);
    lines.push("");
    lines.push(`${renderMoves(branch.moves)} *`);
    lines.push("");
  }

  return lines.join("\n");
}

export function serializeRepertoireToPGN(
  stats: OpeningStats[],
  username: string,
): string {
  return stats
    .map((s) => serializeOpeningToPGN(s, username))
    .filter(Boolean)
    .join("\n");
}

interface Branch {
  moves: string[];
  weight: number;
}

function collectBranches(
  tree: OpeningStats["tree"],
  prefix: string[] = [],
  minCount = 2,
  maxBranches = 6,
): Branch[] {
  const children = Object.values(tree.children).sort((a, b) => b.count - a.count);
  if (children.length === 0 || prefix.length >= 14) {
    return prefix.length ? [{ moves: prefix, weight: tree.count }] : [];
  }
  const top = children.filter((c) => c.count >= minCount).slice(0, maxBranches);
  if (top.length === 0 && children[0]) top.push(children[0]);

  const branches: Branch[] = [];
  for (const child of top) {
    branches.push(...collectBranches(child, [...prefix, child.san], minCount, maxBranches));
  }
  return branches;
}

function renderMoves(sans: string[]): string {
  const out: string[] = [];
  for (let i = 0; i < sans.length; i++) {
    if (i % 2 === 0) out.push(`${i / 2 + 1}.`);
    out.push(sans[i]);
  }
  return out.join(" ");
}

/**
 * Emit the full tree of an opening as a SINGLE PGN game, with alternatives
 * encoded using nested `(...)` variations. Unlike `serializeOpeningToPGN`
 * which flattens the tree into one chapter per branch, this preserves the
 * original tree shape so Lichess/Scid can render it as a study with real
 * variations.
 */
export function serializeOpeningWithVariations(
  stats: OpeningStats,
  username: string,
  minCount = 1,
): string {
  const entry = stats.entry;
  const chapterName = entry?.name ?? "Repertoire";
  const baseMoves = entry?.moves ?? [];

  const hasMainline = Object.keys(stats.tree.children).length > 0;
  if (baseMoves.length === 0 && !hasMainline) return "";

  const body = renderTreeWithVariations(stats.tree, baseMoves.length, minCount);
  const basePart = baseMoves.length ? renderMoves(baseMoves) : "";
  const moveText = [basePart, body].filter(Boolean).join(" ").trim();
  if (!moveText) return "";

  const lines: string[] = [];
  lines.push(`[Event "${chapterName} — ${username} repertoire"]`);
  lines.push(`[Site "repertoire-scanner"]`);
  lines.push(`[Date "${formatDate(Date.now())}"]`);
  lines.push(`[White "${username}"]`);
  lines.push(`[Black "Repertoire tree"]`);
  lines.push(`[Result "*"]`);
  if (entry?.eco) lines.push(`[ECO "${entry.eco}"]`);
  if (entry) lines.push(`[Opening "${entry.name}"]`);
  lines.push("");
  lines.push(`${moveText} *`);
  lines.push("");
  return lines.join("\n");
}

export function serializeRepertoireWithVariations(
  stats: OpeningStats[],
  username: string,
  minCount = 1,
): string {
  return stats
    .map((s) => serializeOpeningWithVariations(s, username, minCount))
    .filter(Boolean)
    .join("\n");
}

function renderTreeWithVariations(
  root: MoveNode,
  basePly: number,
  minCount: number,
): string {
  const tokens: string[] = [];
  walk(root, basePly, tokens, minCount);
  return tokens.join(" ");
}

function walk(
  node: MoveNode,
  ply: number,
  out: string[],
  minCount: number,
): void {
  const children = Object.values(node.children)
    .filter((c) => c.count >= minCount)
    .sort((a, b) => b.count - a.count);
  if (children.length === 0) return;

  const [main, ...alts] = children;
  appendMoveToken(out, ply, main.san);

  for (const alt of alts) {
    const variation: string[] = [];
    appendMoveToken(variation, ply, alt.san, true);
    walk(alt, ply + 1, variation, minCount);
    out.push(`(${variation.join(" ")})`);
  }

  walk(main, ply + 1, out, minCount);
}

function appendMoveToken(
  out: string[],
  ply: number,
  san: string,
  variationStart = false,
): void {
  const isWhite = ply % 2 === 0;
  const moveNumber = Math.floor(ply / 2) + 1;
  if (isWhite) {
    out.push(`${moveNumber}.${san}`);
  } else if (variationStart) {
    out.push(`${moveNumber}...${san}`);
  } else {
    out.push(san);
  }
}

/**
 * Emit one PGN game per raw game — suitable for filtering to the subset of
 * games that reached a given opening/variation.
 */
export function serializeGamesToPGN(records: readonly GameRecord[]): string {
  return records.map(serializeGameRecord).filter(Boolean).join("\n");
}

/**
 * Return the subset of games that reached the selected opening AND followed
 * the given move path past the ECO match point.
 */
export function filterGamesByPath(
  stats: OpeningStats,
  path: readonly string[],
): GameRecord[] {
  if (path.length === 0) return stats.games;
  return stats.games.filter((rec) => {
    const continuation = rec.game.moves.slice(rec.atPly);
    if (continuation.length < path.length) return false;
    for (let i = 0; i < path.length; i++) {
      if (continuation[i] !== path[i]) return false;
    }
    return true;
  });
}

function serializeGameRecord(rec: GameRecord): string {
  const g = rec.game;
  const lines: string[] = [];
  lines.push(`[Event "${escapeTag(platformLabel(g.platform))}"]`);
  lines.push(`[Site "${escapeTag(g.url)}"]`);
  lines.push(`[Date "${formatDate(g.date)}"]`);
  lines.push(`[White "${escapeTag(g.white.name)}"]`);
  lines.push(`[Black "${escapeTag(g.black.name)}"]`);
  lines.push(`[Result "${RESULT_TAG[g.result]}"]`);
  if (g.white.rating) lines.push(`[WhiteElo "${g.white.rating}"]`);
  if (g.black.rating) lines.push(`[BlackElo "${g.black.rating}"]`);
  lines.push(`[TimeControl "${g.timeClass}"]`);
  if (g.id) lines.push(`[GameId "${escapeTag(g.id)}"]`);
  lines.push("");
  lines.push(`${renderMoves(g.moves)} ${RESULT_TAG[g.result]}`);
  lines.push("");
  return lines.join("\n");
}

function platformLabel(platform: GameSummary["platform"]): string {
  return platform === "lichess" ? "Lichess" : "Chess.com";
}

function escapeTag(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function formatDate(ms: number): string {
  const d = new Date(ms);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}.${m}.${day}`;
}
