"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, type MouseEvent } from "react";
import { LOCALES, LOCALE_INFO, type Locale } from "@/lib/i18n/config";

const LOCALE_COOKIE = "NEXT_LOCALE";

interface Props {
  currentLocale: Locale;
  label: string;
}

// SSR renders the bare <a> tags so crawlers see real outgoing links. After
// hydration, onClick mirrors the dropdown switcher: persist NEXT_LOCALE so a
// future visit to "/" lands on the chosen language, and preserve any nuqs scan
// state so the user doesn't lose their dashboard. We read window.location
// instead of useSearchParams to avoid the SSR bail-out that suspended the
// page body and caused the original "no outgoing links" issue.
export function FooterLocaleNav({ currentLocale, label }: Props) {
  const pathname = usePathname() ?? "/";
  const router = useRouter();

  const handleClick = useCallback(
    (event: MouseEvent<HTMLAnchorElement>, next: Locale) => {
      // Let modifier keys / middle-click fall through so open-in-new-tab still
      // works (and lands on the bare `/${loc}` URL, which is what the user
      // asked for).
      if (
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        event.button !== 0
      ) {
        return;
      }
      event.preventDefault();
      // No-op on the active locale rather than letting the browser navigate to
      // the bare `/${loc}` href, which would drop the current path and any
      // nuqs scan state.
      if (next === currentLocale) return;
      const parts = pathname.split("/").filter(Boolean);
      if (parts[0] && (LOCALES as readonly string[]).includes(parts[0])) {
        parts[0] = next;
      } else {
        parts.unshift(next);
      }
      const search =
        typeof window === "undefined" ? "" : window.location.search;
      const href = `/${parts.join("/")}${search}`;
      document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
      router.push(href);
    },
    [currentLocale, pathname, router],
  );

  return (
    <nav
      aria-label={label}
      className="flex flex-wrap gap-x-3 gap-y-1"
    >
      {LOCALES.map((loc) => {
        const info = LOCALE_INFO[loc];
        const active = loc === currentLocale;
        return (
          <a
            key={loc}
            href={`/${loc}`}
            hrefLang={info.bcp47}
            lang={info.bcp47}
            aria-current={active ? "page" : undefined}
            onClick={(event) => handleClick(event, loc)}
            className={
              active
                ? "font-semibold text-foreground"
                : "hover:text-foreground"
            }
          >
            {info.native}
          </a>
        );
      })}
    </nav>
  );
}
