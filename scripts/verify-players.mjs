#!/usr/bin/env node
// Verify every chess.com + lichess handle in lib/landing/players.ts:
// - reports handles that don't exist (404)
// - reports closed / banned accounts
// - reports dormant accounts (no play in >1 year or <20 total games)
//
// Usage:  node scripts/verify-players.mjs [--apply]
// Without --apply: prints a report to stdout.
// With --apply:    rewrites lib/landing/players.ts removing dead handles
//                  (and dropping entries that end up with no platform).

import { readFile, writeFile } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";

const PLAYERS_FILE = new URL("../lib/landing/players.ts", import.meta.url);
const APPLY = process.argv.includes("--apply");
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
const MIN_GAMES = 20;

const CHESSCOM_CONCURRENCY = 8;
const LICHESS_BATCH_SIZE = 250;

// Lazy-construct a simple label so the report stays readable.
function fmt(player, platform, handle, status, extra = "") {
  const tag = status.padEnd(10);
  const label = `${player.name} [${player.country}]`;
  return `  ${tag} ${platform.padEnd(9)} ${handle.padEnd(28)} — ${label}${extra ? ` · ${extra}` : ""}`;
}

// ---------------------------------------------------------------------------
// Parsing players.ts — simple regex walk over the POPULAR_PLAYERS array.
// We intentionally avoid evaluating TS; we just need the handles + line map.
// ---------------------------------------------------------------------------

async function parsePlayers() {
  const src = await readFile(PLAYERS_FILE, "utf8");
  const lines = src.split("\n");
  const entries = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed.startsWith("{ name:")) continue;

    const nameMatch = line.match(/name:\s*"([^"]+)"/);
    const countryMatch = line.match(/country:\s*"([^"]+)"/);
    const lichessMatch = line.match(/lichess:\s*"([^"]+)"/);
    const chesscomMatch = line.match(/chesscom:\s*"([^"]+)"/);
    if (!nameMatch) continue;

    entries.push({
      line: i,
      raw: line,
      name: nameMatch[1],
      country: countryMatch?.[1] ?? "??",
      lichess: lichessMatch?.[1] ?? null,
      chesscom: chesscomMatch?.[1] ?? null,
    });
  }

  return { src, lines, entries };
}

// ---------------------------------------------------------------------------
// Chess.com — one request per handle (no batch endpoint). Rate-limit via a
// small pool of concurrent workers.
// ---------------------------------------------------------------------------

async function checkChesscom(username) {
  const url = `https://api.chess.com/pub/player/${encodeURIComponent(username.toLowerCase())}`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "repertoire-scanner verify-players (+local)" },
    });
    if (res.status === 404) return { status: "missing" };
    if (res.status === 410) return { status: "closed" };
    if (!res.ok) return { status: "error", detail: `http ${res.status}` };
    const body = await res.json();
    const apiStatus = body.status ?? "";
    if (apiStatus.startsWith("closed")) {
      return { status: "closed", detail: apiStatus };
    }
    const lastOnline = (body.last_online ?? 0) * 1000;
    const now = Date.now();
    if (lastOnline && now - lastOnline > ONE_YEAR_MS) {
      return { status: "stale", detail: new Date(lastOnline).toISOString().slice(0, 10) };
    }
    return { status: "ok", detail: lastOnline ? new Date(lastOnline).toISOString().slice(0, 10) : "" };
  } catch (err) {
    return { status: "error", detail: String(err).slice(0, 80) };
  }
}

async function runChesscomChecks(entries) {
  const targets = entries.filter((e) => e.chesscom);
  const results = new Map();
  let cursor = 0;

  async function worker() {
    while (cursor < targets.length) {
      const idx = cursor++;
      const entry = targets[idx];
      const res = await checkChesscom(entry.chesscom);
      results.set(entry.chesscom.toLowerCase(), res);
      process.stdout.write(
        `  [${idx + 1}/${targets.length}] chess.com ${entry.chesscom.padEnd(28)} → ${res.status}\n`,
      );
      // Gentle pacing to stay far below the public rate cap.
      await delay(100);
    }
  }

  await Promise.all(
    Array.from({ length: CHESSCOM_CONCURRENCY }, () => worker()),
  );
  return results;
}

// ---------------------------------------------------------------------------
// Lichess — batch API. POST /api/users with newline-separated usernames,
// returns a JSON array.
// ---------------------------------------------------------------------------

async function runLichessChecks(entries) {
  const targets = entries.filter((e) => e.lichess);
  const results = new Map();
  for (let i = 0; i < targets.length; i += LICHESS_BATCH_SIZE) {
    const batch = targets.slice(i, i + LICHESS_BATCH_SIZE);
    const body = batch.map((e) => e.lichess).join(",");
    const res = await fetch("https://lichess.org/api/users", {
      method: "POST",
      headers: {
        "Content-Type": "text/plain",
        "User-Agent": "repertoire-scanner verify-players (+local)",
      },
      body,
    });
    if (!res.ok) {
      console.error(`Lichess batch failed: ${res.status}`);
      for (const entry of batch) {
        results.set(entry.lichess.toLowerCase(), {
          status: "error",
          detail: `batch http ${res.status}`,
        });
      }
      continue;
    }
    const json = await res.json();
    const byId = new Map(json.map((u) => [u.id?.toLowerCase(), u]));
    for (const entry of batch) {
      const id = entry.lichess.toLowerCase();
      const user = byId.get(id);
      if (!user) {
        results.set(id, { status: "missing" });
        continue;
      }
      if (user.disabled || user.closed) {
        results.set(id, { status: "closed" });
        continue;
      }
      if (user.tosViolation) {
        results.set(id, { status: "closed", detail: "ToS" });
        continue;
      }
      // Batch API doesn't return `count.all`; sum perfs.*.games instead.
      const perfs = user.perfs ?? {};
      const total = Object.values(perfs).reduce(
        (acc, p) => acc + (p && typeof p.games === "number" ? p.games : 0),
        0,
      );
      const seenAt = user.seenAt ?? 0;
      const now = Date.now();
      if (total < MIN_GAMES) {
        results.set(id, { status: "stale", detail: `${total} games` });
        continue;
      }
      if (seenAt && now - seenAt > ONE_YEAR_MS) {
        results.set(id, {
          status: "stale",
          detail: `seen ${new Date(seenAt).toISOString().slice(0, 10)}`,
        });
        continue;
      }
      results.set(id, {
        status: "ok",
        detail: seenAt ? new Date(seenAt).toISOString().slice(0, 10) : "",
      });
      process.stdout.write(
        `  lichess   ${entry.lichess.padEnd(28)} → ok\n`,
      );
    }
    // Polite pause between batches
    await delay(500);
  }
  return results;
}

// ---------------------------------------------------------------------------
// Main — run both, print a report, optionally rewrite players.ts.
// ---------------------------------------------------------------------------

async function main() {
  const { src, lines, entries } = await parsePlayers();
  console.log(
    `Parsed ${entries.length} player entries (${entries.filter((e) => e.chesscom).length} chess.com · ${entries.filter((e) => e.lichess).length} lichess).\n`,
  );

  console.log("Checking lichess handles (batched)…");
  const lichessResults = await runLichessChecks(entries);

  console.log("\nChecking chess.com handles (one-by-one, be patient)…");
  const chesscomResults = await runChesscomChecks(entries);

  // ------------------------------------------------------------------
  // Build the report grouped by severity.
  // ------------------------------------------------------------------
  const dead = [];
  const stale = [];
  const ok = [];

  for (const e of entries) {
    if (e.chesscom) {
      const r = chesscomResults.get(e.chesscom.toLowerCase());
      if (!r) continue;
      if (r.status === "missing" || r.status === "closed") {
        dead.push(fmt(e, "chesscom", e.chesscom, r.status, r.detail));
      } else if (r.status === "stale") {
        stale.push(fmt(e, "chesscom", e.chesscom, r.status, r.detail));
      } else if (r.status === "ok") {
        ok.push(fmt(e, "chesscom", e.chesscom, r.status, r.detail));
      }
    }
    if (e.lichess) {
      const r = lichessResults.get(e.lichess.toLowerCase());
      if (!r) continue;
      if (r.status === "missing" || r.status === "closed") {
        dead.push(fmt(e, "lichess", e.lichess, r.status, r.detail));
      } else if (r.status === "stale") {
        stale.push(fmt(e, "lichess", e.lichess, r.status, r.detail));
      } else if (r.status === "ok") {
        ok.push(fmt(e, "lichess", e.lichess, r.status, r.detail));
      }
    }
  }

  console.log("\n===================================================");
  console.log(`DEAD / MISSING (${dead.length})`);
  console.log("===================================================");
  for (const l of dead) console.log(l);
  console.log("\n===================================================");
  console.log(`STALE (>1y inactive or <${MIN_GAMES} games) (${stale.length})`);
  console.log("===================================================");
  for (const l of stale) console.log(l);
  console.log("\n===================================================");
  console.log(`OK (${ok.length})`);
  console.log("===================================================");

  // ------------------------------------------------------------------
  // --apply: rewrite players.ts, dropping dead/stale handles.
  // ------------------------------------------------------------------
  if (!APPLY) {
    console.log("\n(dry-run — rerun with --apply to rewrite players.ts)");
    return;
  }

  const isBad = (s) => s && (s.status === "missing" || s.status === "closed" || s.status === "stale");

  const newLines = lines.slice();
  let removedLines = 0;
  let strippedHandles = 0;

  for (const e of entries) {
    const badCC = e.chesscom && isBad(chesscomResults.get(e.chesscom.toLowerCase()));
    const badLi = e.lichess && isBad(lichessResults.get(e.lichess.toLowerCase()));
    if (!badCC && !badLi) continue;

    let updated = newLines[e.line];
    if (badCC) {
      // Remove chesscom: "...", plus the trailing ", " if present.
      updated = updated.replace(/\s*chesscom:\s*"[^"]+",?/, "");
      strippedHandles++;
    }
    if (badLi) {
      updated = updated.replace(/\s*lichess:\s*"[^"]+",?/, "");
      strippedHandles++;
    }

    // If the entry no longer has any handle, drop the whole line.
    const hasAny = /(chesscom|lichess):\s*"/.test(updated);
    if (!hasAny) {
      newLines[e.line] = null;
      removedLines++;
    } else {
      // Cleanup: double spaces and stray trailing commas.
      updated = updated
        .replace(/,\s*,/g, ",")
        .replace(/,\s*}/g, " }")
        .replace(/\{\s+,/g, "{");
      newLines[e.line] = updated;
    }
  }

  const outSrc = newLines.filter((l) => l !== null).join("\n");
  await writeFile(PLAYERS_FILE, outSrc);
  console.log(
    `\nApplied: stripped ${strippedHandles} handles, removed ${removedLines} entirely-dead entries.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
