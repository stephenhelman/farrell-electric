// Generates portal PWA icons from the FE monogram (public/brand/favicon-512.png),
// flattened full-bleed onto the brand-blue tile (OS applies its own rounding/mask).
// Run: node scripts/make-pwa-icons.mjs
import sharp from "sharp";

const BLUE = "#1c4f9c";
const SRC = "public/brand/favicon-512.png";

async function icon(size, scale, out) {
  const inner = Math.round(size * scale);
  const mark = await sharp(SRC).resize(inner, inner).toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: BLUE } })
    .composite([{ input: mark, gravity: "center" }])
    .png()
    .toFile(out);
}

await icon(192, 1, "public/brand/pwa-192.png");
await icon(512, 1, "public/brand/pwa-512.png");
// Maskable: shrink so the monogram sits inside the central safe zone.
await icon(512, 0.74, "public/brand/pwa-maskable-512.png");
await icon(180, 1, "public/brand/apple-touch-icon.png");
