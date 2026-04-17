#!/usr/bin/env node
/**
 * Convert the Lichess chess-openings TSV files (already downloaded to
 * /tmp/eco-data/{a..e}.tsv) into lib/catalog/eco-data.ts — a TS module that
 * exports an EPD → { eco, name, moves } lookup.
 *
 * Usage: node scripts/build-eco.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { Chess } from "chess.js";

const files = ["a", "b", "c", "d", "e"].map(
  (l) => `/tmp/eco-data/${l}.tsv`,
);

// Map of EPD → entry. Keep the latest (deepest) entry wins on collision,
// but since each EPD typically maps to exactly one row in the Lichess set,
// collisions are rare.
const lookup = new Map();

for (const path of files) {
  const txt = readFileSync(path, "utf8");
  const lines = txt.split(/\r?\n/);
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const [eco, name, pgn] = line.split("\t");
    if (!eco || !name || !pgn) continue;

    const chess = new Chess();
    const moves = [];
    try {
      chess.loadPgn(pgn);
      for (const m of chess.history()) moves.push(m);
    } catch {
      continue;
    }

    const fen = chess.fen();
    // Strip halfmove clock + fullmove counter for move-order tolerance.
    const epd = fen.split(" ").slice(0, 4).join(" ");

    // Prefer the deepest match if two rows share the same EPD.
    const existing = lookup.get(epd);
    if (existing && existing.moves.length >= moves.length) continue;
    lookup.set(epd, { eco, name, moves });
  }
}

console.error(`Collected ${lookup.size} unique EPDs`);

// Emit TS module. We split name into family / variation when possible so the
// list UI can group openings. The convention in Lichess data is
// "Family Name: Variation Name".
const entries = Array.from(lookup.entries()).map(([epd, v]) => {
  const [familyRaw, ...rest] = v.name.split(":");
  const family = familyRaw.trim();
  return {
    epd,
    eco: v.eco,
    name: v.name,
    family,
    moves: v.moves,
  };
});

// Sort by ECO then depth for readable diffs (not semantically required).
entries.sort((a, b) =>
  a.eco.localeCompare(b.eco) || a.moves.length - b.moves.length,
);

const header = `// Auto-generated from Lichess chess-openings (MIT).
// Source: https://github.com/lichess-org/chess-openings
// Do not edit by hand — regenerate via \`node scripts/build-eco.mjs\`.

export interface EcoRecord {
  eco: string;
  name: string;
  family: string;
  moves: string[];
}

/**
 * Keyed by EPD (FEN without halfmove/fullmove). Used to classify any chess
 * position (regardless of move order) against the ECO taxonomy.
 */
export const ECO_BY_EPD: Record<string, EcoRecord> = ${JSON.stringify(
  Object.fromEntries(
    entries.map((e) => [
      e.epd,
      { eco: e.eco, name: e.name, family: e.family, moves: e.moves },
    ]),
  ),
  null,
  0,
)};

export const ECO_ENTRY_COUNT = ${entries.length};
`;

writeFileSync(
  "lib/catalog/eco-data.ts",
  header,
);
console.error("Wrote lib/catalog/eco-data.ts");
