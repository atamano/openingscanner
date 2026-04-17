"use client";

import { Loader2, Search } from "lucide-react";
import { useMemo } from "react";
import { parseAsBoolean, parseAsString, useQueryState } from "nuqs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";
import type {
  Platform,
  ScanColor,
  ScanParams,
  TimeClass,
} from "@/lib/sources/types";

const TIME_OPTIONS: { value: TimeClass; label: string }[] = [
  { value: "bullet", label: "Bullet" },
  { value: "blitz", label: "Blitz" },
  { value: "rapid", label: "Rapid" },
  { value: "classical", label: "Classical" },
];

const DATE_PRESETS = [
  { value: "30d", label: "30 d" },
  { value: "6m", label: "6 mo" },
  { value: "1y", label: "1 yr" },
  { value: "all", label: "All" },
] as const;

type DatePreset = (typeof DATE_PRESETS)[number]["value"];

interface ScanFormProps {
  onSubmit: (params: ScanParams) => void;
  lichessToken: string | null;
  running: boolean;
  onAbort: () => void;
}

export function ScanForm({ onSubmit, lichessToken, running, onAbort }: ScanFormProps) {
  const [username, setUsername] = useQueryState("u", parseAsString.withDefault(""));
  const [platform, setPlatform] = useQueryState(
    "p",
    parseAsString.withDefault("lichess"),
  );
  const [color, setColor] = useQueryState("c", parseAsString.withDefault("both"));
  const [rated, setRated] = useQueryState(
    "rated",
    parseAsBoolean.withDefault(true),
  );
  const [times, setTimes] = useQueryState(
    "tc",
    parseAsString.withDefault("blitz,rapid"),
  );
  const [datePreset, setDatePreset] = useQueryState(
    "d",
    parseAsString.withDefault("1y"),
  );

  const selectedTimes = useMemo(
    () => (times ? times.split(",").filter(Boolean) : []) as TimeClass[],
    [times],
  );

  const canSubmit = username.trim().length > 0 && !running;

  const submit = () => {
    if (!canSubmit) return;
    const since = datePresetToSince(datePreset as DatePreset);
    onSubmit({
      platform: platform as Platform,
      username: username.trim(),
      lichessToken: platform === "lichess" ? lichessToken ?? undefined : undefined,
      filters: {
        color: color as ScanColor,
        ratedOnly: rated,
        timeClasses: selectedTimes,
        since,
        maxGames: 2000,
      },
    });
  };

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div className="grid gap-5 sm:grid-cols-[1fr_auto]">
        <div className="space-y-1.5">
          <Label htmlFor="username">Player username</Label>
          <Input
            id="username"
            autoComplete="off"
            spellCheck={false}
            placeholder={
              platform === "lichess" ? "e.g. DrNykterstein" : "e.g. Hikaru"
            }
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Platform</Label>
          <ToggleGroup
            type="single"
            value={platform}
            onValueChange={(v) => v && setPlatform(v)}
          >
            <ToggleGroupItem value="lichess">Lichess</ToggleGroupItem>
            <ToggleGroupItem value="chesscom">Chess.com</ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label>Color</Label>
          <ToggleGroup
            type="single"
            value={color}
            onValueChange={(v) => v && setColor(v)}
          >
            <ToggleGroupItem value="white">White</ToggleGroupItem>
            <ToggleGroupItem value="black">Black</ToggleGroupItem>
            <ToggleGroupItem value="both">Both</ToggleGroupItem>
          </ToggleGroup>
        </div>

        <div className="space-y-1.5">
          <Label>Time controls</Label>
          <ToggleGroup
            type="multiple"
            value={selectedTimes}
            onValueChange={(v) => setTimes(v.join(","))}
          >
            {TIME_OPTIONS.map((t) => (
              <ToggleGroupItem key={t.value} value={t.value}>
                {t.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>

        <div className="space-y-1.5">
          <Label>Window</Label>
          <ToggleGroup
            type="single"
            value={datePreset}
            onValueChange={(v) => v && setDatePreset(v)}
          >
            {DATE_PRESETS.map((d) => (
              <ToggleGroupItem key={d.value} value={d.value}>
                {d.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <Switch checked={rated} onCheckedChange={(c) => setRated(c)} />
          Rated only
        </label>

        {running ? (
          <Button type="button" variant="outline" onClick={onAbort}>
            <Loader2 className="animate-spin" /> Stop
          </Button>
        ) : (
          <Button type="submit" size="lg" disabled={!canSubmit}>
            <Search /> Scan repertoire
          </Button>
        )}
      </div>
    </form>
  );
}

function datePresetToSince(preset: DatePreset): number | undefined {
  const now = Date.now();
  switch (preset) {
    case "30d":
      return now - 30 * 24 * 60 * 60 * 1000;
    case "6m":
      return now - 6 * 30 * 24 * 60 * 60 * 1000;
    case "1y":
      return now - 365 * 24 * 60 * 60 * 1000;
    case "all":
    default:
      return undefined;
  }
}
