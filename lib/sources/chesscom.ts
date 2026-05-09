import { pgnToSanMoves } from "@/lib/pgn/parse-chesscom";
import { fetchWithRetry } from "@/lib/sources/fetch-retry";
import type {
  GameSummary,
  ScanFilters,
  TimeClass,
} from "@/lib/sources/types";

interface ChessComArchive {
  archives: string[];
}

interface ChessComGame {
  url: string;
  pgn: string;
  end_time: number;
  rated: boolean;
  time_class: string;
  rules: string;
  uuid: string;
  white: { username: string; rating?: number; result: string };
  black: { username: string; rating?: number; result: string };
}

const TIME_CLASS_SET: Record<string, TimeClass> = {
  bullet: "bullet",
  blitz: "blitz",
  rapid: "rapid",
  daily: "correspondence",
};

export async function* streamChessComGames(
  username: string,
  filters: ScanFilters,
  onLabel?: (label: string) => void,
  signal?: AbortSignal,
  onWarn?: (msg: string) => void,
): AsyncGenerator<GameSummary> {
  const archivesUrl = `https://api.chess.com/pub/player/${encodeURIComponent(
    username.trim().toLowerCase(),
  )}/games/archives`;
  // Route through retry too — chess.com's archives endpoint is the gate to
  // the whole scan, and a single 429/5xx here used to kill the entire run.
  const archivesRes = await fetchArchiveWithRetry(archivesUrl, signal);
  if (!archivesRes.ok) {
    if (archivesRes.status === 404) {
      throw new Error(`Chess.com user "${username}" not found`);
    }
    throw new Error(`Chess.com API error ${archivesRes.status}`);
  }
  const archivesBody = (await archivesRes.json()) as Partial<ChessComArchive>;
  const archives = Array.isArray(archivesBody.archives)
    ? archivesBody.archives
    : [];

  // Iterate archives newest-first so maxGames caps the most recent window.
  // Sort explicitly by year/month rather than relying on the API's documented
  // (but not guaranteed) ascending order.
  const ordered = [...archives].sort((a, b) => {
    const ab = archiveBounds(a)?.start ?? 0;
    const bb = archiveBounds(b)?.start ?? 0;
    return bb - ab;
  });

  let emitted = 0;

  for (const archiveUrl of ordered) {
    if (signal?.aborted) return;
    const range = archiveBounds(archiveUrl);
    if (range && filters.until && range.start > filters.until) continue;
    // Newest-first: once an archive ends before `since`, every later iteration
    // is older too — stop walking.
    if (range && filters.since && range.end < filters.since) return;

    const label = archiveLabel(archiveUrl);
    onLabel?.(label);

    const monthRes = await fetchArchiveWithRetry(archiveUrl, signal);
    if (!monthRes.ok) {
      // Don't kill the whole scan on a single archive failure. Surface a
      // warning so the UI can tell the user the scan is partial.
      onWarn?.(`${label} archive failed (${monthRes.status})`);
      continue;
    }
    const monthBody = (await monthRes.json()) as { games?: ChessComGame[] };
    const games = Array.isArray(monthBody.games) ? monthBody.games : [];

    // Sort newest-first explicitly — the chess.com API's chronological order
    // is empirically ascending but undocumented.
    const reversed = games
      .slice()
      .sort((a, b) => b.end_time - a.end_time);

    for (const raw of reversed) {
      if (signal?.aborted) return;
      if (raw.rules !== "chess") continue;

      const endMs = raw.end_time * 1000;
      if (filters.since && endMs < filters.since) continue;
      if (filters.until && endMs > filters.until) continue;
      if (filters.ratedOnly && !raw.rated) continue;

      const timeClass = TIME_CLASS_SET[raw.time_class];
      if (!timeClass) continue;
      if (filters.timeClasses.length && !filters.timeClasses.includes(timeClass)) {
        continue;
      }

      const white = raw.white.username.toLowerCase();
      const black = raw.black.username.toLowerCase();
      const u = username.toLowerCase();
      const playerIsWhite = white === u;
      const playerIsBlack = black === u;
      if (!playerIsWhite && !playerIsBlack) continue;
      if (filters.color === "white" && !playerIsWhite) continue;
      if (filters.color === "black" && !playerIsBlack) continue;

      const moves = pgnToSanMoves(raw.pgn);
      if (moves.length === 0) continue;

      const result = chesscomResult(raw);

      yield {
        id: raw.uuid,
        platform: "chesscom",
        url: raw.url,
        date: endMs,
        white: { name: raw.white.username, rating: raw.white.rating },
        black: { name: raw.black.username, rating: raw.black.rating },
        result,
        timeClass,
        rated: raw.rated,
        moves,
      };

      emitted++;
      if (filters.maxGames && emitted >= filters.maxGames) return;
    }
  }
}

function fetchArchiveWithRetry(
  url: string,
  signal?: AbortSignal,
): Promise<Response> {
  return fetchWithRetry(
    url,
    {},
    { backoffs: [750, 1500, 3000], maxRetryAfterMs: 15000 },
    signal,
  );
}

function archiveBounds(
  archiveUrl: string,
): { start: number; end: number } | null {
  const m = archiveUrl.match(/\/(\d{4})\/(\d{2})$/);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  return {
    start: Date.UTC(year, month - 1, 1),
    end: Date.UTC(year, month, 1) - 1,
  };
}

function archiveLabel(archiveUrl: string): string {
  const m = archiveUrl.match(/\/(\d{4})\/(\d{2})$/);
  if (!m) return archiveUrl;
  const [, y, mo] = m;
  return `${y}-${mo}`;
}

function chesscomResult(raw: ChessComGame): GameSummary["result"] {
  // Chess.com "result" on either side: "win" | "resigned" | "timeout" | "checkmated" | "agreed" | "stalemate" | "repetition" | ...
  if (raw.white.result === "win") return "white";
  if (raw.black.result === "win") return "black";
  return "draw";
}
