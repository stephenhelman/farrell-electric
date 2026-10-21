// Portal-only manifest. Next only emits file-based manifest.ts at the app root
// (that one stays for the marketing/public layouts), so the portal serves its own
// via a route handler, linked from the app-portal layout metadata. The portal is
// served from the root of app.farrellelectric.com (middleware rewrites into
// /app-portal), so scope and start_url are "/" on that host.
const manifest = {
  name: "Farrell Electric",
  short_name: "Farrell",
  description: "Farrell Electric rep portal — leads, quotes and jobs.",
  id: "/",
  start_url: "/",
  scope: "/",
  display: "standalone",
  background_color: "#1C4F9C",
  theme_color: "#0f1013",
  icons: [
    { src: "/brand/pwa-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
    { src: "/brand/pwa-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    { src: "/brand/pwa-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
  ],
};

export function GET() {
  return new Response(JSON.stringify(manifest), {
    headers: { "Content-Type": "application/manifest+json" },
  });
}
