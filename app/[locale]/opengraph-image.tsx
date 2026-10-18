import { ImageResponse } from "next/og";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionary";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Opening Scanner";

export default async function OpengraphImage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : "en";
  const dict = await getDictionary(locale);

  const PAPER = "#ede6ff";
  const INK = "#1d1442";
  const INK_LIGHT = "#5a507c";
  const WOOD = "#5b3df5";
  const GREEN = "#8fd8ff";
  const AMBER = "#ffd43b";
  const RED = "#ff9acb";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: PAPER,
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
              width: 22,
              height: 22,
              borderRadius: 6,
              background: AMBER,
              border: `3px solid ${INK}`,
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
              fontSize: 84,
              fontWeight: 800,
              color: INK,
              lineHeight: 1,
              letterSpacing: -3,
              display: "flex",
              maxWidth: 1000,
            }}
          >
            {dict.landing.h1}
          </div>
          <div
            style={{
              fontSize: 40,
              color: WOOD,
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
            borderTop: `3px solid ${INK}`,
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
                  width: 16,
                  height: 16,
                  borderRadius: 8,
                  border: `2px solid ${INK}`,
                  background: GREEN,
                }}
              />
              Lichess
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: 8,
                  border: `2px solid ${INK}`,
                  background: RED,
                }}
              />
              Chess.com
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: 8,
                  border: `2px solid ${INK}`,
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
