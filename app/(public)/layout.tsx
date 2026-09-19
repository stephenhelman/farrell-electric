import type { Metadata } from "next";
import { Oswald, Inter } from "next/font/google";
import "../globals.css";

const displayFace = Oswald({
  variable: "--font-display-face",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const textFace = Inter({
  variable: "--font-text-face",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Farrell Electric — Quote",
  robots: { index: false, follow: false },
};

export default function PublicLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${displayFace.variable} ${textFace.variable}`}>
      <body>{children}</body>
    </html>
  );
}
