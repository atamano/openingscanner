/**
 * Extract the list of SAN moves from a Chess.com PGN string.
 *
 * Chess.com PGNs already contain clean SAN tokens in the move section, so a
 * regex pass is an order of magnitude faster than loading the game into a
 * chess.js instance. The helper strips tag pairs, comments, clock/eval
 * annotations, NAGs, move numbers, and the final result marker.
 */
const TAG_PAIR_BLOCK = /^\s*(\[[^\]]*\]\s*)+/;
const COMMENT = /\{[^}]*\}/g;
const VARIATION = /\([^)]*\)/g;
const NAG = /\$\d+/g;
const MOVE_NUMBER = /\b\d+\.{1,3}/g;
const RESULT = /\s+(1-0|0-1|1\/2-1\/2|\*)\s*$/;

const SAN_TOKEN = /^([NBRQK]?[a-h]?[1-8]?x?[a-h][1-8](=[NBRQ])?|O-O(-O)?)[+#]?[!?]*$/;

export function pgnToSanMoves(pgn: string): string[] {
  const body = pgn
    .replace(TAG_PAIR_BLOCK, "")
    .replace(COMMENT, "")
    .replace(VARIATION, "")
    .replace(NAG, "")
    .replace(MOVE_NUMBER, "")
    .replace(RESULT, "")
    .trim();
  if (!body) return [];
  const tokens = body.split(/\s+/);
  const moves: string[] = [];
  for (const t of tokens) {
    if (SAN_TOKEN.test(t)) moves.push(t);
  }
  return moves;
}
