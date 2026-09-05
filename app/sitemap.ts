import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.farrellelectric.com";

const STATIC_ROUTES: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
  { path: "/", priority: 1, changeFrequency: "weekly" },
  { path: "/landscape-lighting", priority: 0.9, changeFrequency: "monthly" },
  { path: "/permanent-lighting", priority: 0.9, changeFrequency: "monthly" },
  { path: "/outdoor-lighting", priority: 0.7, changeFrequency: "monthly" },
  { path: "/our-work", priority: 0.8, changeFrequency: "weekly" },
  { path: "/financing", priority: 0.5, changeFrequency: "monthly" },
  { path: "/electrical-services", priority: 0.8, changeFrequency: "monthly" },
  { path: "/residential-electrician", priority: 0.6, changeFrequency: "monthly" },
  { path: "/commercial-electrician", priority: 0.6, changeFrequency: "monthly" },
  { path: "/electrical-service-calls", priority: 0.6, changeFrequency: "monthly" },
  { path: "/about", priority: 0.5, changeFrequency: "yearly" },
  { path: "/contact", priority: 0.6, changeFrequency: "yearly" },
];

/**
 * /service-area/[city] is intentionally excluded — no cities are confirmed
 * yet, and the route is marked noindex until real city docs exist.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return STATIC_ROUTES.map((route) => ({
    url: `${SITE_URL}${route.path}`,
    lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
