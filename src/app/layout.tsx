import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { site } from "@/config/site";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: `${site.name} - Barber à ${site.city}`, template: `%s | ${site.name}` },
  description: `${site.name}, barber à ${site.city}. Sur rendez-vous.`,
  openGraph: { siteName: site.name, locale: "fr_FR", type: "website" },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
};

// Décide avant le premier paint si l'intro joue : une fois par session, pas en reduced-motion, accueil seulement.
const introGate = `try{if(!matchMedia("(prefers-reduced-motion: reduce)").matches&&location.pathname==="/"&&!sessionStorage.getItem("dysicut-intro"))document.documentElement.dataset.intro="play"}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: introGate }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
