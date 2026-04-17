# Repertoire Scanner

Scan a Lichess or Chess.com player's online games and extract their opening repertoire against a curated catalog of ~40 popular openings. Dashboard with per-opening frequency, win-rate, drill-down move tree, PGN export, and Lichess study export.

## Dev

```bash
pnpm install
pnpm dev
```

Open http://localhost:3000.

## How it works

- All computation runs client-side in a Web Worker (zero server state).
- Games stream from the platform APIs (Lichess NDJSON, Chess.com monthly archives).
- Each game is classified against the curated preset catalog (`lib/catalog/openings.ts`) by longest-prefix SAN match.
- Aggregated stats + gap analysis are returned to the main thread.

## Stack

Next.js 16 · React 19 · Tailwind v4 · shadcn/ui · chess.js · react-chessboard · comlink · zustand · nuqs
