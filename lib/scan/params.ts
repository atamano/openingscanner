import type { Platform, ScanColor, TimeClass } from "@/lib/sources/types";

export const PLATFORMS = ["lichess", "chesscom"] as const satisfies readonly Platform[];
export const SCAN_COLORS = ["white", "black", "both"] as const satisfies readonly ScanColor[];
export const TIME_CLASSES = [
  "bullet",
  "blitz",
  "rapid",
  "classical",
  "correspondence",
] as const satisfies readonly TimeClass[];
export const DATE_PRESETS = ["30d", "6m", "1y", "all"] as const;

export type DatePreset = (typeof DATE_PRESETS)[number];
