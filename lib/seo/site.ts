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
  name: "Repertoire Scanner",
  shortName: "Repertoire Scanner",
  description:
    "Scan any Lichess or Chess.com player and extract their opening repertoire — classified against the full ECO catalog, with win rates, gap analysis and Lichess study export. Free, local-first, nothing leaves your browser.",
  tagline: "What openings does any player actually play?",
  locale: "en_US",
  twitter: "@lichess",
  keywords: [
    "chess opening scanner",
    "chess repertoire analyzer",
    "lichess opening tracker",
    "chess.com opening tracker",
    "chess repertoire builder",
    "ECO classification",
    "opening explorer",
    "chess openings by player",
    "opening repertoire tool",
  ],
} as const;
