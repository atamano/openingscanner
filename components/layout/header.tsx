"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { useDictionary, useLocale } from "@/lib/i18n/context";

interface HeaderProps {
  onNewScan?: () => void;
  subtitle?: React.ReactNode;
}

export function Header({ onNewScan, subtitle }: HeaderProps) {
  const dict = useDictionary();
  const locale = useLocale();
  return (
    <header className="wood-panel border-b-2 border-amber-dark/30 shrink-0">
      <div className="flex h-11 items-center gap-4 px-5">
        {onNewScan ? (
          <button
            type="button"
            onClick={onNewScan}
            className="text-base font-bold tracking-tight text-amber-light select-none rounded-md -mx-1 px-1 hover:text-paper transition-colors"
            style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
            aria-label={dict.header.backToHome}
          >
            Opening Scanner
          </button>
        ) : (
          <Link
            href={`/${locale}`}
            className="text-base font-bold tracking-tight text-amber-light select-none rounded-md -mx-1 px-1 hover:text-paper transition-colors"
            style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
            aria-label={dict.header.backToHome}
          >
            Opening Scanner
          </Link>
        )}

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
            {dict.header.newScan}
          </button>
        ) : null}

        <LocaleSwitcher />
      </div>
    </header>
  );
}
