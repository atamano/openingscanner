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

        <a
          href="https://github.com/atamano/openingscanner"
          target="_blank"
          rel="noopener"
          aria-label="GitHub"
          className="flex items-center justify-center h-7 w-7 rounded-md text-amber-light/80 hover:text-amber-light hover:bg-wood-lighter/30 transition-all"
        >
          <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
            className="h-4 w-4"
          >
            <path d="M12 .5C5.73.5.75 5.48.75 11.75c0 4.98 3.22 9.2 7.69 10.7.56.1.77-.24.77-.54v-1.9c-3.13.68-3.79-1.5-3.79-1.5-.51-1.3-1.25-1.65-1.25-1.65-1.02-.7.08-.68.08-.68 1.13.08 1.72 1.16 1.72 1.16 1 1.72 2.64 1.22 3.28.93.1-.73.39-1.22.71-1.5-2.5-.28-5.13-1.25-5.13-5.58 0-1.23.44-2.23 1.16-3.02-.12-.28-.5-1.43.11-2.97 0 0 .95-.3 3.1 1.15.9-.25 1.86-.37 2.82-.37.96 0 1.93.12 2.82.37 2.15-1.45 3.1-1.15 3.1-1.15.61 1.54.23 2.69.11 2.97.72.79 1.16 1.79 1.16 3.02 0 4.34-2.64 5.3-5.15 5.57.4.35.76 1.03.76 2.08v3.08c0 .3.2.64.78.53 4.47-1.5 7.68-5.72 7.68-10.7C23.25 5.48 18.27.5 12 .5z" />
          </svg>
        </a>

        <LocaleSwitcher />
      </div>
    </header>
  );
}
