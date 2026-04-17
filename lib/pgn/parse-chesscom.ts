import { Chess } from "chess.js";

/**
 * Extract the list of SAN moves from a PGN string using chess.js as the
 * source of truth. Returns an empty array if the PGN can't be loaded.
 */
export function pgnToSanMoves(pgn: string): string[] {
  const chess = new Chess();
  try {
    chess.loadPgn(pgn, { strict: false });
  } catch {
    return [];
  }
  return chess.history();
}
