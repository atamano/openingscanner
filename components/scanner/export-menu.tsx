"use client";

import { Download, FileDown, Layers } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  filterGamesByPath,
  serializeGamesToPGN,
  serializeOpeningWithVariations,
  serializeRepertoireToPGN,
  serializeRepertoireWithVariations,
} from "@/lib/pgn/serialize";
import { UNCATEGORIZED_ID } from "@/lib/catalog/openings";
import type { RepertoireStats } from "@/lib/repertoire/aggregate";
import type { PlayerColor } from "@/lib/sources/types";

interface ExportMenuProps {
  stats: RepertoireStats;
  color: PlayerColor;
  selectedOpeningId?: string | null;
  path?: readonly string[];
}

export function ExportMenu({
  stats,
  color,
  selectedOpeningId,
  path = [],
}: ExportMenuProps) {
  const selected = selectedOpeningId
    ? stats.byOpening[selectedOpeningId] ?? null
    : null;

  const openingLabel = selected?.entry?.name ?? null;

  const triggerDownload = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "application/x-chess-pgn" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const openingsForColor = () =>
    Object.values(stats.byOpening).filter(
      (s) =>
        (s.entry?.color === color || s.openingId === UNCATEGORIZED_ID) &&
        s.gameCount >= 3,
    );

  const exportGames = () => {
    if (selected) {
      const games = filterGamesByPath(selected, path);
      if (games.length === 0) {
        toast.error("No games match this variation.");
        return;
      }
      const pgn = serializeGamesToPGN(games);
      const slug = slugify(openingLabel ?? "opening");
      const suffix = path.length ? `-${path.length}ply` : "";
      triggerDownload(pgn, `${stats.username}-${slug}${suffix}-games.pgn`);
      toast.success(
        `${games.length} game${games.length === 1 ? "" : "s"} downloaded`,
      );
      return;
    }
    const openings = openingsForColor();
    const games = openings.flatMap((s) => s.games);
    if (games.length === 0) {
      toast.error("No games to export yet.");
      return;
    }
    const pgn = serializeGamesToPGN(games);
    triggerDownload(pgn, `${stats.username}-${color}-games.pgn`);
    toast.success(
      `${games.length} ${color} game${games.length === 1 ? "" : "s"} downloaded`,
    );
  };

  const exportRepertoire = () => {
    if (selected) {
      const pgn = serializeOpeningWithVariations(selected, stats.username);
      if (!pgn) {
        toast.error("Not enough data for this opening yet.");
        return;
      }
      const slug = slugify(openingLabel ?? "opening");
      triggerDownload(pgn, `${stats.username}-${slug}-repertoire.pgn`);
      toast.success("Repertoire downloaded");
      return;
    }
    const openings = openingsForColor();
    const pgn =
      serializeRepertoireWithVariations(openings, stats.username) ||
      serializeRepertoireToPGN(openings, stats.username);
    if (!pgn) {
      toast.error("Nothing to export yet.");
      return;
    }
    triggerDownload(pgn, `${stats.username}-${color}-repertoire.pgn`);
    toast.success("Repertoire downloaded");
  };

  const selectedGameCount = selected
    ? filterGamesByPath(selected, path).length
    : 0;
  const scopeLabel = selected
    ? path.length
      ? `this variation (${selectedGameCount} game${selectedGameCount === 1 ? "" : "s"})`
      : (openingLabel ?? "selected opening")
    : `all ${color} games`;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="default">
          <Download />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span>Export scope</span>
          <span className="truncate text-[11px] font-normal text-muted-foreground">
            {scopeLabel}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={exportGames}
          disabled={selected ? selectedGameCount === 0 : false}
        >
          <Layers className="size-4" />
          <div className="flex flex-col">
            <span>Export the games (PGN)</span>
            <span className="text-xs text-muted-foreground">
              Real games reaching{" "}
              {selected ? "this position" : `your ${color} repertoire`}
            </span>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={exportRepertoire}>
          <FileDown className="size-4" />
          <div className="flex flex-col">
            <span>Export the repertoire (PGN)</span>
            <span className="text-xs text-muted-foreground">
              Study-ready: mainline + every continuation as a nested variation
            </span>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "opening"
  );
}
