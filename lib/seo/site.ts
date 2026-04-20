const DEFAULT_DEV_URL = "http://localhost:3000";

function stripTrailingSlash(url: string): string {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

export function getSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return stripTrailingSlash(explicit);

  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${stripTrailingSlash(vercel)}`;

  return DEFAULT_DEV_URL;
}

export const SITE = {
  name: "Opening Scanner",
  shortName: "Opening Scanner",
  description:
    "Opening Scanner is a free chess opening scanner: enter any Lichess or Chess.com username and instantly see their real opening repertoire — classified against the full ECO catalog, with win rates, weak spots, gap analysis and PGN export. Local-first, nothing leaves your browser.",
  tagline: "What openings does any player actually play?",
  locale: "en_US",
  keywords: [
    "opening scanner",
    "chess opening scanner",
    "chess repertoire scanner",
    "lichess opening scanner",
    "chess.com opening scanner",
    "chess repertoire analyzer",
    "ECO classification",
    "opening explorer",
    "chess openings by player",
    "opening repertoire tool",
  ],
} as const;
