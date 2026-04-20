export type Platform = "lichess" | "chesscom";

export type PlayerColor = "white" | "black";

export type ScanColor = PlayerColor | "both";

export type TimeClass =
  | "bullet"
  | "blitz"
  | "rapid"
  | "classical"
  | "correspondence";

export type GameResult = "white" | "black" | "draw";

export interface Player {
  name: string;
  rating?: number;
}

export interface GameSummary {
  id: string;
  platform: Platform;
  url: string;
  date: number;
  white: Player;
  black: Player;
  result: GameResult;
  timeClass: TimeClass;
  rated: boolean;
  moves: string[]; // SAN
}

export interface ScanFilters {
  color: ScanColor;
  timeClasses: TimeClass[];
  ratedOnly: boolean;
  since?: number; // epoch ms
  until?: number;
  maxGames?: number;
}

export interface ScanParams {
  platform: Platform;
  username: string;
  filters: ScanFilters;
}

/**
 * Lightweight snapshot of one of the most-played openings, emitted alongside
 * progress updates so the UI can show a live preview while the scan runs.
 * Kept minimal because Comlink serializes this on every emit.
 */
export interface PartialOpeningSnapshot {
  /** Stable unique id (matches OpeningStats.openingId) — distinct EPDs may
   * share the same display name, so the id is what callers should key on. */
  id: string;
  name: string;
  family: string | null;
  eco: string | null;
  color: PlayerColor;
  gameCount: number;
  wins: number;
  draws: number;
  losses: number;
}

export interface ScanProgressEvent {
  fetched: number;
  classified: number;
  elapsedMs: number;
  currentLabel?: string;
  /** Top openings detected so far, sorted by gameCount desc. */
  topOpenings?: PartialOpeningSnapshot[];
}
