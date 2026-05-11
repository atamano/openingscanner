"use client";

import { useDictionary } from "@/lib/i18n/context";
import {
  type ConfidenceTier,
  confidenceTier,
} from "@/lib/repertoire/confidence";
import { cn } from "@/lib/utils";

const STYLE: Record<ConfidenceTier, string> = {
  weak: "border-border bg-muted/60 text-muted-foreground",
  moderate:
    "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  high: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  stable:
    "border-emerald-500/40 bg-emerald-500/15 text-emerald-800 dark:text-emerald-200",
};

const DOT: Record<ConfidenceTier, string> = {
  weak: "bg-muted-foreground/50",
  moderate: "bg-amber-500",
  high: "bg-emerald-500",
  stable: "bg-emerald-600",
};

interface ConfidenceBadgeProps {
  n: number;
  size?: "xs" | "sm";
  className?: string;
  /** Hide the text label, keep just the dot (and tooltip on hover). */
  dotOnly?: boolean;
}

export function ConfidenceBadge({
  n,
  size = "sm",
  className,
  dotOnly = false,
}: ConfidenceBadgeProps) {
  const dict = useDictionary();
  const tier = confidenceTier(n);
  const label = dict.confidence[tier];
  const tooltip = dict.confidence.tooltip
    .replace("{label}", label)
    .replace("{n}", String(n));

  if (dotOnly) {
    return (
      <span
        role="img"
        aria-label={tooltip}
        title={tooltip}
        className={cn(
          "inline-block size-2 rounded-full",
          DOT[tier],
          className,
        )}
      />
    );
  }

  return (
    <span
      role="img"
      aria-label={tooltip}
      title={tooltip}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border font-medium uppercase tracking-wide",
        size === "xs"
          ? "px-1.5 py-0 text-[9px] leading-4"
          : "px-2 py-0.5 text-[10px] leading-4",
        STYLE[tier],
        className,
      )}
    >
      <span className={cn("size-1.5 shrink-0 rounded-full", DOT[tier])} />
      {label}
    </span>
  );
}
