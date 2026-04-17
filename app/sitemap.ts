import type { MetadataRoute } from "next";
import {
  DEFAULT_LOCALE,
  LOCALES,
  LOCALE_INFO,
} from "@/lib/i18n/config";
import { getSiteUrl } from "@/lib/seo/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteUrl();
  const now = new Date();

  const languages = Object.fromEntries(
    LOCALES.map((l) => [LOCALE_INFO[l].bcp47, `${base}/${l}`]),
  );

  return LOCALES.map((locale) => ({
    url: `${base}/${locale}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: locale === DEFAULT_LOCALE ? 1 : 0.8,
    alternates: {
      languages: { ...languages, "x-default": `${base}/${DEFAULT_LOCALE}` },
    },
  }));
}
