import { ImageResponse } from "next/og";
import { SITE } from "@/lib/seo/site";

export const runtime = "nodejs";
export const alt = `${SITE.name} — ${SITE.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
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
          backgroundImage: `radial-gradient(circle at 20% 0%, rgba(139,107,71,0.08) 0%, transparent 50%), radial-gradient(circle at 80% 100%, rgba(90,168,116,0.06) 0%, transparent 50%)`,
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
            textTransform: "uppercase",
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
          Scan · Classify · Export
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
              fontSize: 108,
              fontWeight: 700,
              color: WOOD,
              lineHeight: 1,
              letterSpacing: -3,
              display: "flex",
            }}
          >
            Repertoire
          </div>
          <div
            style={{
              fontSize: 108,
              fontWeight: 700,
              color: INK,
              lineHeight: 1,
              letterSpacing: -3,
              marginTop: 8,
              display: "flex",
            }}
          >
            Scanner.
          </div>
          <div
            style={{
              fontSize: 36,
              color: INK_LIGHT,
              marginTop: 32,
              lineHeight: 1.25,
              display: "flex",
              maxWidth: 900,
            }}
          >
            What openings does any player actually play?
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: `1px solid rgba(26,22,18,0.12)`,
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
              3000+ ECO openings
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
            free · local-first
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
