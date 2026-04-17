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
import { useDictionary } from "@/lib/i18n/context";
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
  const dict = useDictionary();
  const colorLabel =
    color === "white" ? dict.form.colorWhite : dict.form.colorBlack;

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

  const gamesSuffix = (n: number) =>
    n === 1
      ? dict.weakSpots.gameSuffixOne
      : dict.weakSpots.gameSuffixMany;

  const exportGames = () => {
    if (selected) {
      const games = filterGamesByPath(selected, path);
      if (games.length === 0) {
        toast.error(dict.export.toastNoGamesMatch);
        return;
      }
      const pgn = serializeGamesToPGN(games);
      const slug = slugify(openingLabel ?? "opening");
      const suffix = path.length ? `-${path.length}ply` : "";
      triggerDownload(pgn, `${stats.username}-${slug}${suffix}-games.pgn`);
      toast.success(
        (games.length === 1
          ? dict.export.toastGamesDownloaded
          : dict.export.toastGamesDownloadedPlural
        ).replace("{count}", String(games.length)),
      );
      return;
    }
    const openings = openingsForColor();
    const games = openings.flatMap((s) => s.games);
    if (games.length === 0) {
      toast.error(dict.export.toastNoGamesYet);
      return;
    }
    const pgn = serializeGamesToPGN(games);
    triggerDownload(pgn, `${stats.username}-${color}-games.pgn`);
    toast.success(
      (games.length === 1
        ? dict.export.toastGamesDownloaded
        : dict.export.toastGamesDownloadedPlural
      ).replace("{count}", String(games.length)),
    );
  };

  const exportRepertoire = () => {
    if (selected) {
      const pgn = serializeOpeningWithVariations(selected, stats.username);
      if (!pgn) {
        toast.error(dict.export.toastNotEnough);
        return;
      }
      const slug = slugify(openingLabel ?? "opening");
      triggerDownload(pgn, `${stats.username}-${slug}-repertoire.pgn`);
      toast.success(dict.export.toastRepertoireDownloaded);
      return;
    }
    const openings = openingsForColor();
    const pgn =
      serializeRepertoireWithVariations(openings, stats.username) ||
      serializeRepertoireToPGN(openings, stats.username);
    if (!pgn) {
      toast.error(dict.export.toastNothingYet);
      return;
    }
    triggerDownload(pgn, `${stats.username}-${color}-repertoire.pgn`);
    toast.success(dict.export.toastRepertoireDownloaded);
  };

  const selectedGameCount = selected
    ? filterGamesByPath(selected, path).length
    : 0;
  const scopeLabel = selected
    ? path.length
      ? dict.export.scopeVariation
          .replace("{count}", String(selectedGameCount))
          .replace("{suffix}", gamesSuffix(selectedGameCount))
      : (openingLabel ?? dict.export.scopeSelectedOpening)
    : dict.export.scopeAllColorGames.replace(
        "{color}",
        colorLabel.toLowerCase(),
      );

  const gamesDescScope = selected
    ? dict.export.exportGamesDescPosition
    : dict.export.exportGamesDescRepertoire.replace(
        "{color}",
        colorLabel.toLowerCase(),
      );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="default">
          <Download />
          {dict.export.trigger}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span>{dict.export.scopeLabel}</span>
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
            <span>{dict.export.exportGames}</span>
            <span className="text-xs text-muted-foreground">
              {dict.export.exportGamesDesc.replace("{scope}", gamesDescScope)}
            </span>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={exportRepertoire}>
          <FileDown className="size-4" />
          <div className="flex flex-col">
            <span>{dict.export.exportRepertoire}</span>
            <span className="text-xs text-muted-foreground">
              {dict.export.exportRepertoireDesc}
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
