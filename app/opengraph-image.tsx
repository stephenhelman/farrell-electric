import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Farrell Electric — Premium Outdoor Lighting, Backed by Electrical Experience Since 1980";

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "#0a0a0c",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 40, fontWeight: 700, letterSpacing: 2, marginBottom: 24 }}>FARRELL ELECTRIC</div>
        <div style={{ fontSize: 64, fontWeight: 700, lineHeight: 1.1, maxWidth: 900 }}>
          Premium Outdoor Lighting
        </div>
        <div style={{ fontSize: 40, fontWeight: 500, color: "#557bb5", marginTop: 12 }}>
          Backed by Electrical Experience Since 1980
        </div>
      </div>
    ),
    { ...size },
  );
}
