import type { Metadata, Viewport } from "next";
import { Archivo, Bricolage_Grotesque } from "next/font/google";

import "./globals.css";

const archivo = Archivo({
  variable: "--font-archivo",
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
  themeColor: "#0a0711",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en-IN"
      className={`${archivo.variable} ${bricolage.variable} h-full antialiased`}
    >
      <body className="bg-ink text-content flex min-h-full flex-col">{children}</body>
    </html>
  );
}
