import Dexie, { type EntityTable } from "dexie";
import type { MoveNode, RepertoireStats } from "@/lib/repertoire/aggregate";
import type { ScanParams } from "@/lib/sources/types";

/**
 * Bump when the persisted shape of `SavedScan.stats` (or `params`) changes in
 * a non-backward-compatible way. `loadLastScan` clears rows that don't match.
 */
const SCHEMA_VERSION = 3;

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
    // v3 reshaped ScanParams from { platform, username } to { sources[] }.
    // Drop stale rows so rehydrate doesn't read fields that no longer exist.
    this.version(3)
      .stores({ scans: "id" })
      .upgrade((tx) => tx.table("scans").clear());

    // Multi-tab safety: if a newer tab loads with a bumped schema version,
    // close this connection so the upgrade can proceed instead of blocking.
    this.on("versionchange", () => this.close());
    this.on("blocked", () => {
      console.warn("scanner DB upgrade blocked by another tab");
    });
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
 * unavailable-exports state via `stats.gamesRetained === false`. Move-tree
 * nodes also carry a `lastGame` reference for inline single-game rows;
 * structured-clone would deep-copy each one and bloat the payload, so we
 * strip them here too. The render path already gates on `gamesRetained`.
 */
function stripGamesForPersistence(stats: RepertoireStats): RepertoireStats {
  const byOpening: RepertoireStats["byOpening"] = {};
  for (const [id, opening] of Object.entries(stats.byOpening)) {
    byOpening[id] = {
      ...opening,
      games: [],
      tree: stripLastGame(opening.tree),
    };
  }
  return {
    ...stats,
    byOpening,
    globalTreeByColor: {
      white: stripLastGame(stats.globalTreeByColor.white),
      black: stripLastGame(stats.globalTreeByColor.black),
    },
    gamesRetained: false,
  };
}

function stripLastGame(node: MoveNode): MoveNode {
  const children: Record<string, MoveNode> = {};
  for (const [san, child] of Object.entries(node.children)) {
    children[san] = stripLastGame(child);
  }
  return {
    san: node.san,
    count: node.count,
    playerWins: node.playerWins,
    draws: node.draws,
    playerLosses: node.playerLosses,
    children,
  };
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

function isValidSavedScan(row: unknown): row is SavedScan {
  if (!row || typeof row !== "object") return false;
  const r = row as Partial<SavedScan>;
  if (r.schemaVersion !== SCHEMA_VERSION) return false;
  const s = r.stats;
  if (!s || typeof s !== "object") return false;
  return (
    typeof s.byOpening === "object" &&
    s.byOpening !== null &&
    typeof s.colorBreakdown === "object" &&
    s.colorBreakdown !== null &&
    typeof s.globalTreeByColor === "object" &&
    s.globalTreeByColor !== null
  );
}

export async function loadLastScan(): Promise<SavedScan | null> {
  try {
    const row = await db().scans.get("last");
    if (!row) return null;
    if (!isValidSavedScan(row)) {
      // Stale schema or corrupted row — drop it so next scan writes fresh.
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
