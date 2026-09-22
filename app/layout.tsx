import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Inter } from "next/font/google";

import { cn } from "@/lib/utils";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "House Party with Strangers — Social by Chance",
  description:
    "One night, a pool, and a curated room of people you have not met yet. Gurugram, Friday 26 September.",
  openGraph: {
    title: "House Party with Strangers",
    description:
      "Poolside, food, games and music with a curated crowd of strangers. Gurugram, 26 September.",
    siteName: "Social by Chance",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#fdfcff",
  colorScheme: "light",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en-IN"
      className={cn("h-full antialiased", inter.variable, bricolage.variable)}
    >
      <body className="flex min-h-full flex-col bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
