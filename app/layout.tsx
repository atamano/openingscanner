import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Toaster } from "sonner";
import { Header } from "@/components/layout/header";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0c12" },
  ],
};

export const metadata: Metadata = {
  title: "Repertoire Scanner — Extract opening repertoires from online games",
  description:
    "Scan a Lichess or Chess.com player and extract their opening repertoire matched against a curated catalog of popular openings.",
  openGraph: {
    title: "Repertoire Scanner",
    description: "Extract opening repertoires from online chess games.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider delayDuration={200}>
            <NuqsAdapter>
              <div className="relative min-h-screen">
                <div
                  aria-hidden
                  className="pointer-events-none fixed inset-0 -z-10 grid-pattern opacity-40"
                />
                <Header />
                <main className="mx-auto max-w-7xl px-4 py-10 sm:py-14">
                  {children}
                </main>
              </div>
            </NuqsAdapter>
          </TooltipProvider>
        </ThemeProvider>
        <Toaster
          theme="system"
          richColors
          closeButton
          position="bottom-right"
        />
      </body>
    </html>
  );
}
