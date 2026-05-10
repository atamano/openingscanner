import type { Metadata, Viewport } from "next";
import { DM_Sans, Fraunces, IBM_Plex_Mono } from "next/font/google";
import Script from "next/script";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { notFound } from "next/navigation";
import { Toaster } from "sonner";
import { FooterLocaleNav } from "@/components/layout/footer-locale-nav";
import { ThemeProvider } from "@/components/theme-provider";
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
import { getSiteUrl, isProductionDeployment } from "@/lib/seo/site";
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
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f0e6" },
    { media: "(prefers-color-scheme: dark)", color: "#110b07" },
  ],
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
  // Point x-default at the canonical /en URL, not the apex — the apex 307s
  // through the locale-negotiating proxy, which Ahrefs et al. flag as a
  // redirected hreflang.
  languages["x-default"] = `${siteUrl}/${DEFAULT_LOCALE}`;
  const indexable = isProductionDeployment();

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
    robots: indexable
      ? {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-snippet": -1,
            "max-image-preview": "large",
            "max-video-preview": -1,
          },
        }
      : { index: false, follow: false },
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

function SiteFooter({
  currentLocale,
  languageLabel,
}: {
  currentLocale: Locale;
  languageLabel: string;
}) {
  return (
    <footer className="border-t border-border/60 bg-paper text-ink-light">
      <div className="mx-auto max-w-7xl px-4 py-6 text-xs flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <FooterLocaleNav
          currentLocale={currentLocale}
          label={languageLabel}
        />
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <a
            href="https://github.com/atamano/openingscanner"
            target="_blank"
            rel="noopener"
            className="hover:text-foreground"
          >
            GitHub
          </a>
          <span aria-hidden>·</span>
          <a
            href="https://darksquares.net"
            target="_blank"
            rel="noopener"
            className="hover:text-foreground"
          >
            darksquares.net
          </a>
          <a
            href="https://chessatlas.net"
            target="_blank"
            rel="noopener"
            className="hover:text-foreground"
          >
            chessatlas.net
          </a>
        </div>
      </div>
    </footer>
  );
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
      suppressHydrationWarning
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
        <ThemeProvider>
          <I18nProvider locale={locale} dict={dict}>
            <TooltipProvider delayDuration={200}>
              <NuqsAdapter>{children}</NuqsAdapter>
            </TooltipProvider>
            <Toaster richColors closeButton position="bottom-right" />
          </I18nProvider>
        </ThemeProvider>
        {/* Server-rendered so crawlers see real <a> tags. The page body itself
            sits behind a Suspense fallback={null} (nuqs bails SSR on
            useSearchParams), which would otherwise leave the HTML with zero
            outlinks. Keep this outside the providers — it must not depend on
            client-only context. */}
        <SiteFooter
          currentLocale={locale}
          languageLabel={dict.header.languageLabel}
        />
      </body>
    </html>
  );
}
