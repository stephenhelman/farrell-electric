import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Farrell Electric",
    short_name: "Farrell Electric",
    description: "Premium landscape and permanent outdoor lighting, backed by electrical experience since 1980.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a0c",
    theme_color: "#0a0a0c",
    icons: [
      { src: "/brand/favicon-16.png", sizes: "16x16", type: "image/png" },
      { src: "/brand/favicon-32.png", sizes: "32x32", type: "image/png" },
      { src: "/brand/favicon-180.png", sizes: "180x180", type: "image/png" },
      { src: "/brand/favicon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
