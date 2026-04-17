export const LOCALES = [
  "en",
  "es",
  "fr",
  "de",
  "it",
  "pt-BR",
  "nl",
  "pl",
  "tr",
  "ru",
  "uk",
  "ja",
  "zh-CN",
] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

export const LOCALE_SET: ReadonlySet<string> = new Set(LOCALES);

export function isLocale(value: string): value is Locale {
  return LOCALE_SET.has(value);
}

export interface LocaleInfo {
  code: Locale;
  /** BCP-47 tag for <html lang> and OpenGraph og:locale. */
  bcp47: string;
  /** OpenGraph-style locale (lang_TERRITORY). */
  og: string;
  /** Native display name. */
  native: string;
  /** Text direction. */
  dir: "ltr" | "rtl";
}

export const LOCALE_INFO: Record<Locale, LocaleInfo> = {
  en: { code: "en", bcp47: "en", og: "en_US", native: "English", dir: "ltr" },
  es: { code: "es", bcp47: "es", og: "es_ES", native: "Español", dir: "ltr" },
  fr: { code: "fr", bcp47: "fr", og: "fr_FR", native: "Français", dir: "ltr" },
  de: { code: "de", bcp47: "de", og: "de_DE", native: "Deutsch", dir: "ltr" },
  it: { code: "it", bcp47: "it", og: "it_IT", native: "Italiano", dir: "ltr" },
  "pt-BR": {
    code: "pt-BR",
    bcp47: "pt-BR",
    og: "pt_BR",
    native: "Português",
    dir: "ltr",
  },
  nl: { code: "nl", bcp47: "nl", og: "nl_NL", native: "Nederlands", dir: "ltr" },
  pl: { code: "pl", bcp47: "pl", og: "pl_PL", native: "Polski", dir: "ltr" },
  tr: { code: "tr", bcp47: "tr", og: "tr_TR", native: "Türkçe", dir: "ltr" },
  ru: { code: "ru", bcp47: "ru", og: "ru_RU", native: "Русский", dir: "ltr" },
  uk: { code: "uk", bcp47: "uk", og: "uk_UA", native: "Українська", dir: "ltr" },
  ja: { code: "ja", bcp47: "ja", og: "ja_JP", native: "日本語", dir: "ltr" },
  "zh-CN": {
    code: "zh-CN",
    bcp47: "zh-Hans",
    og: "zh_CN",
    native: "简体中文",
    dir: "ltr",
  },
};

/**
 * Negotiate the best supported locale from an Accept-Language header.
 * Tries exact matches, then base-language prefixes.
 */
export function negotiateLocale(acceptLanguage: string | null): Locale {
  if (!acceptLanguage) return DEFAULT_LOCALE;

  const preferences = acceptLanguage
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params
        .map((p) => p.trim())
        .find((p) => p.startsWith("q="));
      const quality = q ? Number.parseFloat(q.slice(2)) : 1;
      return { tag: tag.toLowerCase(), quality };
    })
    .filter((p) => p.tag && !Number.isNaN(p.quality) && p.quality > 0)
    .sort((a, b) => b.quality - a.quality);

  for (const pref of preferences) {
    const exact = LOCALES.find((l) => l.toLowerCase() === pref.tag);
    if (exact) return exact;
    const base = pref.tag.split("-")[0];
    const prefix = LOCALES.find((l) => l.toLowerCase().split("-")[0] === base);
    if (prefix) return prefix;
  }

  return DEFAULT_LOCALE;
}
