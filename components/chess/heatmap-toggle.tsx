"use client";

import { Flame } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useDictionary } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

interface HeatmapToggleProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

export function HeatmapToggle({ checked, onCheckedChange }: HeatmapToggleProps) {
  const dict = useDictionary();
  return (
    <div
      className="inline-flex h-9 items-center gap-1.5 rounded-md border bg-background/40 px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent/40 hover:text-foreground"
      title={dict.heatmap.tooltip}
    >
      <Flame
        aria-hidden
        className={cn(
          "size-3.5 transition-all",
          checked
            ? "fill-amber-400 text-orange-500 drop-shadow-[0_0_0.1875rem_rgba(251,146,60,0.85)]"
            : "fill-transparent",
        )}
      />
      <span id="heatmap-toggle-label">{dict.heatmap.label}</span>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        aria-labelledby="heatmap-toggle-label"
        className="ml-1"
      />
    </div>
  );
}
