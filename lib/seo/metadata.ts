import type { Metadata } from "next";

/**
 * Every route's metadata flows through this so canonical/OG/Twitter stay
 * consistent without repeating the boilerplate on each page. metadataBase is
 * set once on the root layout, so `path` resolves relative to it.
 */
export function buildMetadata({
  title,
  description,
  path,
}: {
  title: string;
  description: string;
  path: string;
}): Metadata {
  return {
    title,
    description,
    alternates: {
      canonical: path,
    },
    openGraph: {
      title,
      description,
      url: path,
      siteName: "Farrell Electric",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}
