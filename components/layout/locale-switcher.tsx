"use client";

import { Check, Languages } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LOCALES, LOCALE_INFO, type Locale } from "@/lib/i18n/config";
import { useDictionary, useLocale } from "@/lib/i18n/context";

const LOCALE_COOKIE = "NEXT_LOCALE";

export function LocaleSwitcher() {
  const current = useLocale();
  const dict = useDictionary();
  const pathname = usePathname() ?? "/";
  const searchParams = useSearchParams();
  const router = useRouter();

  const switchTo = (next: Locale) => {
    if (next === current) return;
    // Swap the first path segment if it's a known locale; otherwise prepend.
    // Filter out empty segments first so the root path "/" doesn't produce
    // a trailing slash like "/fr/" (which then triggers an extra redirect
    // through proxy.ts).
    const parts = pathname.split("/").filter(Boolean);
    if (parts[0] && LOCALES.includes(parts[0] as Locale)) {
      parts[0] = next;
    } else {
      parts.unshift(next);
    }
    const nextPath = `/${parts.join("/")}`;
    const qs = searchParams?.toString();
    const href = qs ? `${nextPath}?${qs}` : nextPath;

    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    router.push(href);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-medium text-amber-light/80 hover:text-amber-light hover:bg-wood-lighter/30 transition-all"
        aria-label={dict.header.changeLanguage}
      >
        <Languages className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">{LOCALE_INFO[current].native}</span>
        <span className="sm:hidden font-mono uppercase">{current}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-80 overflow-y-auto">
        <DropdownMenuLabel>{dict.header.languageLabel}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {LOCALES.map((loc) => {
          const info = LOCALE_INFO[loc];
          const active = loc === current;
          return (
            <DropdownMenuItem
              key={loc}
              onSelect={() => switchTo(loc)}
              className="flex items-center gap-2"
            >
              <span className="font-mono text-[10px] uppercase text-muted-foreground">
                {loc}
              </span>
              <span className="flex-1">{info.native}</span>
              {active ? <Check className="size-3.5" /> : null}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
