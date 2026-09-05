import type { Metadata } from "next";
import { Oswald, Inter } from "next/font/google";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { MobileActionBar } from "@/components/layout/MobileActionBar";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildLocalBusinessJsonLd } from "@/lib/seo/jsonld";
import { getSiteSettings } from "@/lib/content";
import "./globals.css";
import layoutStyles from "./layout.module.css";

const displayFace = Oswald({
  variable: "--font-display-face",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const textFace = Inter({
  variable: "--font-text-face",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.farrellelectric.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Farrell Electric | Premium Outdoor Lighting, South Florida",
    template: "%s | Farrell Electric",
  },
  description:
    "Premium landscape and permanent outdoor lighting, backed by electrical experience since 1993. Serving Broward and Palm Beach County.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Farrell Electric | Premium Outdoor Lighting, South Florida",
    description:
      "Premium landscape and permanent outdoor lighting, backed by electrical experience since 1993. Serving Broward and Palm Beach County.",
    url: "/",
    siteName: "Farrell Electric",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Farrell Electric | Premium Outdoor Lighting, South Florida",
    description:
      "Premium landscape and permanent outdoor lighting, backed by electrical experience since 1993. Serving Broward and Palm Beach County.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const siteSettings = getSiteSettings();

  return (
    <html lang="en" className={`${displayFace.variable} ${textFace.variable}`}>
      <body>
        <JsonLd data={buildLocalBusinessJsonLd(siteSettings)} />
        <SiteHeader />
        <main className={layoutStyles.main}>{children}</main>
        <SiteFooter />
        <MobileActionBar />
      </body>
    </html>
  );
}
