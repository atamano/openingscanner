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

export const LIMIT_PRESETS = ["500", "2k", "5k", "10k", "all"] as const;

export type LimitPreset = (typeof LIMIT_PRESETS)[number];

export function limitPresetToCount(preset: LimitPreset): number | undefined {
  switch (preset) {
    case "500":
      return 500;
    case "2k":
      return 2000;
    case "5k":
      return 5000;
    case "10k":
      return 10000;
    case "all":
      return undefined;
  }
}
