import type {
  GameSummary,
  ScanFilters,
  TimeClass,
} from "@/lib/sources/types";

const TERMINAL_STATUSES = new Set([
  "mate",
  "resign",
  "stalemate",
  "timeout",
  "draw",
  "outoftime",
  "variantEnd",
]);

const LICHESS_PERF_TO_TIMECLASS: Record<string, TimeClass> = {
  ultraBullet: "bullet",
  bullet: "bullet",
  blitz: "blitz",
  rapid: "rapid",
  classical: "classical",
  correspondence: "correspondence",
};

const TIMECLASS_TO_LICHESS_PERF: Record<TimeClass, string[]> = {
  bullet: ["ultraBullet", "bullet"],
  blitz: ["blitz"],
  rapid: ["rapid"],
  classical: ["classical"],
  correspondence: ["correspondence"],
};

interface LichessGame {
  id: string;
  rated: boolean;
  variant: string;
  speed: string;
  perf: string;
  createdAt: number;
  status: string;
  moves?: string;
  winner?: "white" | "black";
  players: {
    white: { user?: { name: string; id: string }; rating?: number };
    black: { user?: { name: string; id: string }; rating?: number };
  };
}

export async function* streamLichessGames(
  username: string,
  filters: ScanFilters,
  token?: string,
  signal?: AbortSignal,
): AsyncGenerator<GameSummary> {
  const params = new URLSearchParams();
  params.set("moves", "true");
  params.set("tags", "false");
  params.set("pgnInJson", "false");
  params.set("clocks", "false");
  params.set("evals", "false");
  params.set("opening", "false");
  params.set("sort", "dateDesc");

  if (filters.color !== "both") params.set("color", filters.color);
  if (filters.ratedOnly) params.set("rated", "true");
  if (filters.since) params.set("since", String(filters.since));
  if (filters.until) params.set("until", String(filters.until));
  if (filters.maxGames) params.set("max", String(filters.maxGames));
  if (filters.timeClasses.length) {
    const perfs = filters.timeClasses.flatMap(
      (tc) => TIMECLASS_TO_LICHESS_PERF[tc] ?? [],
    );
    if (perfs.length) params.set("perfType", perfs.join(","));
  }

  const url = `https://lichess.org/api/games/user/${encodeURIComponent(
    username,
  )}?${params.toString()}`;

  const headers: HeadersInit = { Accept: "application/x-ndjson" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(url, { headers, signal });
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Lichess user "${username}" not found`);
    }
    throw new Error(
      `Lichess API error ${response.status}: ${await response.text()}`,
    );
  }
  if (!response.body) throw new Error("Lichess API returned empty body");

  const reader = response.body
    .pipeThrough(new TextDecoderStream())
    .getReader();
  let buffer = "";

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += value;
      let nl: number;
      while ((nl = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, nl).trim();
        buffer = buffer.slice(nl + 1);
        if (!line) continue;
        const game = parseLichessLine(line);
        if (game) yield game;
      }
    }
    if (buffer.trim()) {
      const game = parseLichessLine(buffer.trim());
      if (game) yield game;
    }
  } finally {
    reader.releaseLock();
  }
}

function parseLichessLine(line: string): GameSummary | null {
  let raw: LichessGame;
  try {
    raw = JSON.parse(line) as LichessGame;
  } catch {
    return null;
  }
  if (raw.variant !== "standard") return null;
  if (!raw.moves) return null;
  if (!TERMINAL_STATUSES.has(raw.status)) return null;

  const moves = raw.moves.split(" ").filter(Boolean);
  if (moves.length === 0) return null;

  const timeClass = LICHESS_PERF_TO_TIMECLASS[raw.perf] ?? "blitz";
  const result: GameSummary["result"] = raw.winner ?? "draw";

  return {
    id: raw.id,
    platform: "lichess",
    url: `https://lichess.org/${raw.id}`,
    date: raw.createdAt,
    white: {
      name: raw.players.white.user?.name ?? "Anonymous",
      rating: raw.players.white.rating,
    },
    black: {
      name: raw.players.black.user?.name ?? "Anonymous",
      rating: raw.players.black.rating,
    },
    result,
    timeClass,
    rated: raw.rated,
    moves,
  };
}
