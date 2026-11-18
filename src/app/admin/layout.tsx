import type { Metadata } from "next";

// Espace prive : jamais indexe (en plus de l'en-tete X-Robots-Tag de next.config.ts).
export const metadata: Metadata = {
  title: { default: "Admin", template: "%s | Admin" },
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
  manifest: "/admin/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Admin", statusBarStyle: "black" },
};

export const dynamic = "force-dynamic";

export default function AdminRoot({ children }: { children: React.ReactNode }) {
  return children;
}
