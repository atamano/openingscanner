import Dexie, { type EntityTable } from "dexie";
import type { RepertoireStats } from "@/lib/repertoire/aggregate";
import type { ScanParams } from "@/lib/sources/types";

/**
 * Bump when the persisted shape of `SavedScan.stats` (or `params`) changes in
 * a non-backward-compatible way. `loadLastScan` clears rows that don't match.
 */
const SCHEMA_VERSION = 2;

export interface SavedScan {
  /** Fixed slot — we only keep the most recent scan. */
  id: "last";
  schemaVersion: number;
  params: ScanParams;
  stats: RepertoireStats;
  finishedAt: number;
}

// Dexie stores objects via structured clone, so no JSON round-tripping.
class ScannerDB extends Dexie {
  scans!: EntityTable<SavedScan, "id">;

  constructor() {
    super("repertoire-scanner");
    this.version(1).stores({
      // Only indexing the primary key — the payload is opaque.
      scans: "id",
    });
    // v2 introduced schemaVersion + stripped `games` from persisted stats.
    // Rather than trying to migrate stale rows, drop them so the next scan
    // writes the new shape.
    this.version(2)
      .stores({ scans: "id" })
      .upgrade((tx) => tx.table("scans").clear());
  }
}

let _db: ScannerDB | null = null;

function db(): ScannerDB {
  if (typeof indexedDB === "undefined") {
    throw new Error("IndexedDB unavailable in this environment");
  }
  if (!_db) _db = new ScannerDB();
  return _db;
}

/**
 * Raw games multiply the payload size 10–50×. We don't ship them to IDB —
 * exports are an in-session feature, and a rehydrated scan surfaces its
 * unavailable-exports state via `stats.gamesRetained === false`.
 */
function stripGamesForPersistence(stats: RepertoireStats): RepertoireStats {
  const byOpening: RepertoireStats["byOpening"] = {};
  for (const [id, opening] of Object.entries(stats.byOpening)) {
    byOpening[id] = { ...opening, games: [] };
  }
  return { ...stats, byOpening, gamesRetained: false };
}

export async function saveLastScan(
  entry: Omit<SavedScan, "id" | "schemaVersion">,
): Promise<void> {
  try {
    await db().scans.put({
      id: "last",
      schemaVersion: SCHEMA_VERSION,
      params: entry.params,
      stats: stripGamesForPersistence(entry.stats),
      finishedAt: entry.finishedAt,
    });
  } catch {
    // Storage is a nice-to-have; never surface to the user.
  }
}

export async function loadLastScan(): Promise<SavedScan | null> {
  try {
    const row = await db().scans.get("last");
    if (!row) return null;
    if (row.schemaVersion !== SCHEMA_VERSION) {
      await db().scans.delete("last");
      return null;
    }
    return row;
  } catch {
    return null;
  }
}

export async function clearLastScan(): Promise<void> {
  try {
    await db().scans.delete("last");
  } catch {
    // Swallow — refresh will surface any real issue.
  }
}
