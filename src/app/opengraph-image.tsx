import { ImageResponse } from "next/og";
import { logoDataUrl } from "@/lib/brandImage";
import { SITE_NAME } from "@/lib/site";

export const alt = `${SITE_NAME} – AI mock interview and group discussion practice`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const FEATURES = ["Technical & HR interviews", "AI group discussions", "Instant score & PDF report"];

export default async function OpengraphImage() {
  const logo = await logoDataUrl();
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "linear-gradient(135deg, #0b1b45 0%, #2d2c66 50%, #464495 100%)",
          color: "white",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          <div
            style={{
              width: 96,
              height: 96,
              borderRadius: 999,
              background: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logo} width={90} height={90} alt="" />
          </div>
          <div style={{ fontSize: 40, fontWeight: 700 }}>{SITE_NAME}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", flexDirection: "column", fontSize: 66, fontWeight: 800, lineHeight: 1.1 }}>
            <span>Practise interviews with an AI</span>
            <div style={{ display: "flex" }}>
              <span style={{ marginRight: 18 }}>that</span>
              <span style={{ color: "#f9b950" }}>listens and scores</span>
            </div>
          </div>
          <div style={{ fontSize: 30, color: "#cccbeb" }}>
            Speak your answers. Get instant feedback on content, grammar and fluency.
          </div>
        </div>

        <div style={{ display: "flex", gap: 16 }}>
          {FEATURES.map((feature) => (
            <div
              key={feature}
              style={{
                display: "flex",
                padding: "12px 22px",
                borderRadius: 999,
                background: "rgba(240,135,75,0.22)",
                border: "1px solid rgba(249,185,80,0.5)",
                fontSize: 24,
              }}
            >
              {feature}
            </div>
          ))}
        </div>
      </div>
    ),
    size
  );
}
