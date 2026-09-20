import type { Metadata } from "next";
import { Oswald, Inter } from "next/font/google";
import { auth } from "@/lib/app/auth";
import { SessionProviderWrapper } from "@/components/app/SessionProviderWrapper";
import { AppChrome } from "@/components/app/AppChrome";
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
  title: "Farrell Electric — App",
  robots: { index: false, follow: false },
};

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await auth();

  return (
    <html lang="en" className={`${displayFace.variable} ${textFace.variable}`}>
      <body>
        <SessionProviderWrapper>
          <AppChrome userName={session?.user?.name ?? null}>{children}</AppChrome>
        </SessionProviderWrapper>
      </body>
    </html>
  );
}
