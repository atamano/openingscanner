import { Chess } from "chess.js";
import { ECO_BY_EPD, type EcoRecord } from "./eco-data";

export interface EcoMatch extends EcoRecord {
  epd: string;
  /** 1-indexed ply depth at which this match was reached. */
  atPly: number;
}

/** An opening's identity at one position, without the catalog's move list. */
export interface EcoLabel {
  eco: string;
  name: string;
  family: string;
}

/**
 * Classify a game by walking through its SAN moves and returning the deepest
 * position whose EPD is present in the Lichess ECO database. Returns null
 * when no position along the game matched (extremely rare).
 */
export function classifyByEco(moves: readonly string[]): EcoMatch | null {
  const chess = new Chess();
  let best: EcoMatch | null = null;

  const scanDepth = Math.min(moves.length, 24);
  for (let i = 0; i < scanDepth; i++) {
    try {
      chess.move(moves[i]);
    } catch {
      break;
    }
    const epd = fenToEpd(chess.fen());
    const rec = ECO_BY_EPD[epd];
    if (rec) best = { ...rec, epd, atPly: i + 1 };
  }

  return best;
}

/** FEN minus halfmove clock + fullmove counter, for move-order tolerant lookup. */
export function fenToEpd(fen: string): string {
  return fen.split(" ").slice(0, 4).join(" ");
}

/**
 * Name the opening at a single position. Callers that already hold an EPD (the
 * heatmap, which needs a label per candidate square) use this instead of
 * replaying the game through `classifyByEco`.
 *
 * Keep this in the worker. `eco-data` is a ~830 kB object literal, so importing
 * it costs a synchronous parse on whatever thread touches it — see
 * `ScannerAPI.lookupEco`, which is the only way the main thread reaches it.
 */
export function lookupEcoByEpd(epd: string): EcoRecord | null {
  return ECO_BY_EPD[epd] ?? null;
}
