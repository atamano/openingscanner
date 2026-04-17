"use client";

import { Plus } from "lucide-react";

interface HeaderProps {
  onNewScan?: () => void;
  subtitle?: React.ReactNode;
}

export function Header({ onNewScan, subtitle }: HeaderProps) {
  return (
    <header className="wood-panel border-b-2 border-amber-dark/30 shrink-0">
      <div className="flex h-11 items-center gap-4 px-5">
        <span
          className="text-base font-bold tracking-tight text-amber-light select-none"
          style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
        >
          Repertoire Scanner
        </span>

        {subtitle ? (
          <>
            <div className="h-4 w-px bg-wood-lighter" />
            <div className="min-w-0 text-xs text-paper-dark/80">{subtitle}</div>
          </>
        ) : null}

        <div className="flex-1" />

        {onNewScan ? (
          <button
            onClick={onNewScan}
            className="flex items-center gap-1.5 h-7 px-3 rounded-md text-xs font-medium text-amber-light/80 hover:text-amber-light hover:bg-wood-lighter/30 transition-all"
          >
            <Plus className="h-3.5 w-3.5" />
            New scan
          </button>
        ) : null}
      </div>
    </header>
  );
}
