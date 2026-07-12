import type { MetadataRoute } from "next";
import { DEFAULT_LOCALE, LOCALES } from "@/lib/i18n/config";
import {
  getLanguageAlternates,
  getSiteUrl,
  isProductionDeployment,
} from "@/lib/seo/site";

export default function sitemap(): MetadataRoute.Sitemap {
  if (!isProductionDeployment()) return [];

  const base = getSiteUrl();
  const now = new Date();
  const languages = getLanguageAlternates(base);

  return LOCALES.map((locale) => ({
    url: `${base}/${locale}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: locale === DEFAULT_LOCALE ? 1 : 0.8,
    alternates: { languages },
  }));
}
