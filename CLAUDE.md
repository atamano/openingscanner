# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `pnpm dev` — start Next.js dev server on http://localhost:3000
- `pnpm build` / `pnpm start` — production build + run
- `pnpm lint` — `next lint` (ESLint 9, `eslint-config-next`)
- `pnpm typecheck` — `tsc --noEmit` (the only way to validate types; `next build` runs its own check separately)
- `node scripts/build-eco.mjs` — regenerate `lib/catalog/eco-data.ts` from Lichess chess-openings TSVs. Requires `/tmp/eco-data/{a,b,c,d,e}.tsv` to be downloaded first from https://github.com/lichess-org/chess-openings.

There is no test runner configured.

Package manager is pnpm (see `pnpm-lock.yaml`). Path alias `@/*` maps to project root.

## Architecture

Zero server state. The Next.js app is a single client-rendered page; all scanning, streaming, parsing, classification, and aggregation happens in the browser. No API routes exist.

### Scan pipeline (the main data flow)

1. `app/[locale]/page.tsx` renders `ScanForm`, which persists filters to the URL via `nuqs` and calls `useScanner().scan(params)`.
2. `hooks/use-scanner.ts` spawns `workers/scanner.worker.ts` as a module Worker and talks to it via **Comlink**. Progress callbacks are wrapped in `Comlink.proxy`.
3. The worker picks a streamer based on `params.platform`:
   - `lib/sources/lichess.ts` — NDJSON stream from `https://lichess.org/api/games/user/:name` with server-side filtering via query params. Optional Bearer token lifts rate limits.
   - `lib/sources/chesscom.ts` — fetches `/pub/player/:name/games/archives`, then walks monthly archives newest-first, filtering client-side. Chess.com PGNs are reduced to SAN arrays by `lib/pgn/parse-chesscom.ts`.
   Each streamer is an `AsyncGenerator<GameSummary>` that honors an `AbortSignal`.
4. `RepertoireAccumulator` in `lib/repertoire/aggregate.ts` consumes games one at a time and classifies each via `classifyByEco` (below). Opening id = `${epd}|${playerColor}` so transpositions merge and the two sides stay separated.
5. Progress is emitted every 25 games; final `RepertoireStats` returns to the main thread when the generator ends.

Aborting a scan: `useScanner.abort()` → `api.abort()` in the worker → the AbortController cancels the in-flight fetch and the generator loop exits. Starting a new scan auto-aborts the previous one.

### Classification model

Two parallel catalogs — **don't confuse them**:

- **`lib/catalog/eco-data.ts`** (auto-generated, ~3000+ entries, the source of truth for classification). Keyed by **EPD** = FEN with the halfmove clock and fullmove counter stripped, so move-order transpositions resolve to the same key. `classifyByEco` in `lib/catalog/eco-classify.ts` replays up to 24 plies through `chess.js`, computing an EPD at each step and keeping the **deepest** entry that matches. Anything past the match ply is stored as the player's "continuation" in the opening's move tree — this is why transpositions sharing the same EPD also share their subtree.
- **`lib/catalog/openings.ts`** (hand-curated ~40 popular openings with `popularity` scores). Used **only** for the gap-analysis recommendations in `lib/repertoire/gaps.ts` and as a fallback label map. Do not use this for classification — use `classifyByEco`.

The move tree stored per opening (`OpeningStats.tree`) is capped at depth 20 and records wins/draws/losses at each node from the player's perspective.

### i18n

Locale routing lives under `app/[locale]/`. Supported locales are listed in `lib/i18n/config.ts`; dictionaries are JSON files under `lib/i18n/dictionaries/` and typed by `lib/i18n/dictionary.ts`. `proxy.ts` handles locale negotiation (cookie → Accept-Language → default) and `components/layout/locale-switcher.tsx` flips the first path segment while preserving the current query string (nuqs scan state).

### Dashboard filter state

Drill state (`selectedId`, `path`, `previewMoves`) lives in `lib/state/dashboard-filters.tsx` as a React context. `DashboardFiltersProvider` accepts a `resetKey` prop — `app/[locale]/page.tsx` bumps a `scanGen` counter on each scan submit to wipe stale filters from the previous scan.

### URL-as-state

Scan filters (`u`, `p`, `c`, `tc`, `d`) are stored in the URL via `nuqs` so scans are shareable and bookmarkable. `HomePage` is wrapped in `<Suspense>` because `useQueryState` suspends during hydration.

### UI layer

- shadcn/ui "new-york" style, Tailwind v4 via `@tailwindcss/postcss`. Component registry in `components.json`; primitives live in `components/ui/`.
- Feature components are split: `components/scanner/` (form, progress, dashboard, tables, export, gap analysis) and `components/chess/` (board + continuations table). `react-chessboard` + `chess.js` power the interactive board.
- Theming via `next-themes`, default dark.

## Conventions worth knowing

- Web Worker imports use the `new URL("../workers/scanner.worker.ts", import.meta.url)` + `{ type: "module" }` pattern — keep both halves together or bundling breaks.
- The worker file has `/// <reference lib="webworker" />` and `tsconfig.json` includes `webworker` in `lib`. Don't remove either.
- `RepertoireAccumulator` tracks a per-opening running average of opponent rating by stashing a `_ratedCount` field on the stats object. It's deliberately hidden from the public type — leave that dance alone when refactoring.
- Chess.com archives are iterated newest-first so `maxGames` caps the most recent window, not the oldest. Preserve this ordering if you touch `streamChessComGames`.
- When adding catalog entries to `lib/catalog/openings.ts`, the `moves` prefix is what drives longest-prefix matching in the legacy curated classifier; for the actual ECO classification nothing there matters.
