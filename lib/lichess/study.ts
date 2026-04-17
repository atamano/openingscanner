interface CreateStudyOptions {
  token: string;
  name: string;
  pgn: string;
  visibility?: "public" | "unlisted" | "private";
}

/**
 * Create a Lichess study from a PGN file. Uses the unofficial
 * `/api/import` endpoint to seed a single study with imported chapters.
 * Lichess will parse the PGN and create one chapter per game section.
 */
export async function createLichessStudy(
  opts: CreateStudyOptions,
): Promise<{ url: string }> {
  const body = new URLSearchParams({
    pgn: opts.pgn,
    // API: https://lichess.org/api#tag/Studies — note: study creation from PGN
    // is done via /api/study/import. Returns HTML by default; we ask JSON.
  });

  const res = await fetch("https://lichess.org/api/study/import", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${opts.token}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body,
  });

  if (!res.ok) {
    throw new Error(`Lichess study import failed (${res.status})`);
  }

  const data = (await res.json()) as { url?: string; id?: string };
  if (data.url) return { url: data.url };
  if (data.id) return { url: `https://lichess.org/study/${data.id}` };
  throw new Error("Lichess study response missing URL");
}
