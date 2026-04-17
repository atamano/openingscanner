"use client";

import { Download, ExternalLink, FileDown, Loader2 } from "lucide-react";
import { useState } from "react";
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
import { useLichessAuth } from "@/hooks/use-lichess-auth";
import { serializeRepertoireToPGN } from "@/lib/pgn/serialize";
import { createLichessStudy } from "@/lib/lichess/study";
import type { RepertoireStats } from "@/lib/repertoire/aggregate";

interface ExportMenuProps {
  stats: RepertoireStats;
}

export function ExportMenu({ stats }: ExportMenuProps) {
  const { token, login } = useLichessAuth();
  const [busy, setBusy] = useState(false);

  const downloadPGN = () => {
    const openings = Object.values(stats.byOpening).filter(
      (s) => s.entry && s.gameCount >= 3,
    );
    const pgn = serializeRepertoireToPGN(openings, stats.username);
    if (!pgn) {
      toast.error("Nothing to export yet.");
      return;
    }
    const blob = new Blob([pgn], { type: "application/x-chess-pgn" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${stats.username}-repertoire.pgn`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("PGN downloaded");
  };

  const exportLichessStudy = async () => {
    if (!token) {
      toast.info("Connecting to Lichess…");
      login();
      return;
    }
    setBusy(true);
    try {
      const openings = Object.values(stats.byOpening).filter(
        (s) => s.entry && s.gameCount >= 3,
      );
      const pgn = serializeRepertoireToPGN(openings, stats.username);
      const { url } = await createLichessStudy({
        token,
        name: `${stats.username} — Repertoire`,
        pgn,
      });
      toast.success("Study created", {
        action: { label: "Open", onClick: () => window.open(url, "_blank") },
      });
    } catch (err) {
      toast.error("Lichess export failed", {
        description: (err as Error).message,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={busy}>
          {busy ? <Loader2 className="animate-spin" /> : <Download />}
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Export repertoire</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={downloadPGN}>
          <FileDown className="size-4" /> Download as PGN
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={exportLichessStudy}>
          <ExternalLink className="size-4" />{" "}
          {token ? "Create Lichess study" : "Connect Lichess to export"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
