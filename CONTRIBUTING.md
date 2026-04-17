# Contributing

Thanks for taking the time. This project is small and single-maintainer, so the bar is low: open a PR or an issue, even for half-baked ideas.

## Dev setup

```bash
pnpm install
pnpm dev         # http://localhost:3000
pnpm typecheck   # run before PR
pnpm lint
```

Requires Node 20+ and pnpm. `tsc --noEmit` is the authoritative type checker — `next build` runs its own pass but `pnpm typecheck` is what CI (and what you should) rely on.

## What needs help

- **Popular players directory** (`lib/landing/players.ts`) — handles change, accounts get renamed. If you know a streamer's real handle on Lichess or Chess.com and it's missing/wrong, submit a one-line fix.
- **Translations** — copy `lib/i18n/dictionaries/en.json` to a new locale file, translate. Add the locale to `lib/i18n/config.ts` and the dynamic import in `lib/i18n/dictionary.ts`.
- **ECO classifier perf** (`lib/catalog/eco-classify.ts`) — we replay every game through chess.js. There's room to trim work.
- **Gap / weak-spot scoring** (`lib/repertoire/gaps.ts`, `lib/repertoire/weaknesses.ts`) — heuristics, not science. Counter-proposals welcome.
- **Accessibility** — the board interaction was built keyboard-first but there's probably more to do for screen readers.

## Conventions

- **No server state.** This is a client-only app. If your change needs a backend, let's talk first.
- **URL-as-state** for anything the user would want to bookmark/share (see `nuqs` usage in `ScanForm`).
- **Worker boundary**: streaming + classification stay in `workers/scanner.worker.ts`. The main thread only receives aggregated stats + progress events.
- **Don't touch** auto-generated `lib/catalog/eco-data.ts` — regenerate via `node scripts/build-eco.mjs`.
- **Keep comments sparse.** Explain a non-obvious "why", not "what".
- Prefer editing existing files to creating new ones.

## Commit messages

Short, imperative, no prefix required. Example: `feat: weak spots panel` or `fix: chesscom archives order off by one`. Don't squash-force rewrites in PRs; maintainer can squash at merge.

## Reporting bugs

Include:
- Platform (Lichess / Chess.com) and username scanned.
- Browser + OS.
- A screenshot if it's visual.
- The URL at the time of the bug — filter state is in there.

## Code of conduct

Be kind. Don't target people. If someone's behavior is a problem, email antoine.tamano@gmail.com.
