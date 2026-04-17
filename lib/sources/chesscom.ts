import { pgnToSanMoves } from "@/lib/pgn/parse-chesscom";
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
  white: { username: string; rating: number; result: string };
  black: { username: string; rating: number; result: string };
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
): AsyncGenerator<GameSummary> {
  const archivesUrl = `https://api.chess.com/pub/player/${encodeURIComponent(
    username.toLowerCase(),
  )}/games/archives`;
  const archivesRes = await fetch(archivesUrl, { signal });
  if (!archivesRes.ok) {
    if (archivesRes.status === 404) {
      throw new Error(`Chess.com user "${username}" not found`);
    }
    throw new Error(`Chess.com API error ${archivesRes.status}`);
  }
  const { archives } = (await archivesRes.json()) as ChessComArchive;

  // Iterate archives newest-first so maxGames caps the most recent window.
  const ordered = [...archives].reverse();

  let emitted = 0;

  for (const archiveUrl of ordered) {
    if (signal?.aborted) return;
    if (!archiveInRange(archiveUrl, filters)) continue;

    const label = archiveLabel(archiveUrl);
    onLabel?.(label);

    const monthRes = await fetchArchiveWithRetry(archiveUrl, signal);
    if (!monthRes.ok) {
      throw new Error(
        `Chess.com archive ${archiveLabel(archiveUrl)} failed: ${monthRes.status}`,
      );
    }
    const { games } = (await monthRes.json()) as { games: ChessComGame[] };

    // Within a month, newest first too.
    const sorted = [...games].sort((a, b) => b.end_time - a.end_time);

    for (const raw of sorted) {
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

async function fetchArchiveWithRetry(
  url: string,
  signal?: AbortSignal,
): Promise<Response> {
  const res = await fetch(url, { signal });
  if (res.ok) return res;
  if (res.status !== 429 && res.status < 500) return res;

  const retryAfter = Number(res.headers.get("retry-after"));
  const delayMs = Number.isFinite(retryAfter) && retryAfter > 0
    ? Math.min(retryAfter * 1000, 5000)
    : 750;
  await new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, delayMs);
    signal?.addEventListener("abort", () => {
      clearTimeout(t);
      reject(new DOMException("Aborted", "AbortError"));
    }, { once: true });
  });
  return fetch(url, { signal });
}

function archiveInRange(archiveUrl: string, filters: ScanFilters): boolean {
  const m = archiveUrl.match(/\/(\d{4})\/(\d{2})$/);
  if (!m) return true;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const start = Date.UTC(year, month - 1, 1);
  const end = Date.UTC(year, month, 1) - 1;
  if (filters.until && start > filters.until) return false;
  if (filters.since && end < filters.since) return false;
  return true;
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
