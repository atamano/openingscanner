import { ImageResponse } from "next/og";
import { isLocale, LOCALES, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionary";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateImageMetadata() {
  return LOCALES.map((locale) => ({
    id: locale,
    alt: `Opening Scanner — ${locale}`,
    contentType: "image/png",
    size,
  }));
}

export default async function OpengraphImage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : "en";
  const dict = await getDictionary(locale);

  const PAPER = "#f5f0e6";
  const INK = "#1a1612";
  const INK_LIGHT = "#6b5d4f";
  const WOOD = "#8b6b47";
  const GREEN = "#5aa874";
  const AMBER = "#e8a664";
  const RED = "#c87563";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: PAPER,
          backgroundImage:
            "radial-gradient(circle at 20% 0%, rgba(139,107,71,0.08) 0%, transparent 50%), radial-gradient(circle at 80% 100%, rgba(90,168,116,0.06) 0%, transparent 50%)",
          padding: 72,
          position: "relative",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            color: INK_LIGHT,
            fontSize: 22,
            letterSpacing: 1,
          }}
        >
          <div
            style={{
              display: "flex",
              width: 14,
              height: 14,
              borderRadius: 7,
              background: AMBER,
            }}
          />
          Opening Scanner
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: 48,
            flexGrow: 1,
            justifyContent: "center",
          }}
        >
          <div
            style={{
              fontSize: 72,
              fontWeight: 700,
              color: WOOD,
              lineHeight: 1.1,
              letterSpacing: -2,
              display: "flex",
              maxWidth: 1000,
            }}
          >
            {dict.landing.h1}
          </div>
          <div
            style={{
              fontSize: 40,
              color: INK,
              marginTop: 24,
              lineHeight: 1.25,
              display: "flex",
              maxWidth: 1000,
            }}
          >
            {dict.landing.subtitle}
          </div>
          <div
            style={{
              fontSize: 26,
              color: INK_LIGHT,
              marginTop: 20,
              lineHeight: 1.35,
              display: "flex",
              maxWidth: 1000,
            }}
          >
            {dict.landing.badge}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "1px solid rgba(26,22,18,0.12)",
            paddingTop: 28,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 28,
              fontSize: 24,
              color: INK,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 6,
                  background: GREEN,
                }}
              />
              Lichess
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 6,
                  background: RED,
                }}
              />
              Chess.com
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 6,
                  background: AMBER,
                }}
              />
              ECO
            </div>
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 22,
              color: INK_LIGHT,
              fontFamily: "monospace",
            }}
          >
            {locale}
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
