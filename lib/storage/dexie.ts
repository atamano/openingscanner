import Dexie, { type EntityTable } from "dexie";
import type { RepertoireStats } from "@/lib/repertoire/aggregate";
import type { ScanParams } from "@/lib/sources/types";

export interface SavedScan {
  /** Fixed slot — we only keep the most recent scan. */
  id: "last";
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

export async function saveLastScan(entry: Omit<SavedScan, "id">): Promise<void> {
  try {
    await db().scans.put({ id: "last", ...entry });
  } catch {
    // Storage is a nice-to-have; never surface to the user.
  }
}

export async function loadLastScan(): Promise<SavedScan | null> {
  try {
    const row = await db().scans.get("last");
    return row ?? null;
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
