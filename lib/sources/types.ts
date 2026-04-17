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

export interface ScanProgressEvent {
  fetched: number;
  classified: number;
  elapsedMs: number;
  currentLabel?: string;
}
