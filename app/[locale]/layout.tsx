import type { Metadata, Viewport } from "next";
import { DM_Sans, Fraunces, IBM_Plex_Mono } from "next/font/google";
import Script from "next/script";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { notFound } from "next/navigation";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { I18nProvider } from "@/lib/i18n/context";
import {
  DEFAULT_LOCALE,
  LOCALES,
  LOCALE_INFO,
  isLocale,
  type Locale,
} from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionary";
import { getSiteUrl } from "@/lib/seo/site";
import "../globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
});

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f5f0e6",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: raw } = await params;
  if (!isLocale(raw)) return {};
  const locale: Locale = raw;
  const dict = await getDictionary(locale);
  const info = LOCALE_INFO[locale];
  const siteUrl = getSiteUrl();

  const languages = Object.fromEntries(
    LOCALES.map((l) => [LOCALE_INFO[l].bcp47, `${siteUrl}/${l}`]),
  );
  languages["x-default"] = `${siteUrl}/${DEFAULT_LOCALE}`;

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: dict.meta.title,
      template: dict.meta.titleTemplate,
    },
    description: dict.meta.description,
    applicationName: "Opening Scanner",
    keywords: dict.meta.keywords,
    authors: [{ name: "Opening Scanner" }],
    creator: "Opening Scanner",
    publisher: "Opening Scanner",
    category: "Chess",
    alternates: {
      canonical: `${siteUrl}/${locale}`,
      languages,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-snippet": -1,
        "max-image-preview": "large",
        "max-video-preview": -1,
      },
    },
    openGraph: {
      type: "website",
      locale: info.og,
      alternateLocale: LOCALES.filter((l) => l !== locale).map(
        (l) => LOCALE_INFO[l].og,
      ),
      url: `${siteUrl}/${locale}`,
      siteName: "Opening Scanner",
      title: dict.meta.title,
      description: dict.meta.description,
    },
    twitter: {
      card: "summary_large_image",
      title: dict.meta.title,
      description: dict.meta.tagline,
    },
    formatDetection: {
      telephone: false,
      email: false,
      address: false,
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale: Locale = raw;
  const dict = await getDictionary(locale);
  const info = LOCALE_INFO[locale];
  const siteUrl = getSiteUrl();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Opening Scanner",
    description: dict.meta.description,
    url: `${siteUrl}/${locale}`,
    applicationCategory: "GameApplication",
    applicationSubCategory: "Chess",
    operatingSystem: "Any (web browser)",
    browserRequirements: "Requires JavaScript. Requires a modern browser.",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    inLanguage: info.bcp47,
  };
  const jsonLdString = JSON.stringify(jsonLd).replace(/</g, "\\u003c");

  return (
    <html
      lang={info.bcp47}
      dir={info.dir}
      data-scroll-behavior="smooth"
      className={`${dmSans.variable} ${ibmPlexMono.variable} ${fraunces.variable}`}
    >
      <body className="antialiased bg-background text-foreground">
        {/* beforeInteractive renders the tag in the SSR HTML so crawlers that
            don't execute JS still see the structured data. */}
        <Script
          id="jsonld-webapp"
          type="application/ld+json"
          strategy="beforeInteractive"
        >
          {jsonLdString}
        </Script>
        <I18nProvider locale={locale} dict={dict}>
          <TooltipProvider delayDuration={200}>
            <NuqsAdapter>{children}</NuqsAdapter>
          </TooltipProvider>
          <Toaster richColors closeButton position="bottom-right" />
        </I18nProvider>
      </body>
    </html>
  );
}
