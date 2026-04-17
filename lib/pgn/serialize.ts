import { CATALOG_BY_ID } from "@/lib/catalog/openings";
import type { OpeningStats } from "@/lib/repertoire/aggregate";
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
  const entry = stats.entry ?? CATALOG_BY_ID[stats.openingId];
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

function formatDate(ms: number): string {
  const d = new Date(ms);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}.${m}.${day}`;
}
