import { site } from "@/config/site";

// Manifest séparé pour l'admin : l'icône ajoutée depuis /admin s'ouvre directement sur le dashboard.
export function GET() {
  const manifest = {
    name: `${site.name} Admin`,
    short_name: "Admin",
    lang: "fr",
    start_url: "/admin",
    scope: "/admin",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#111111",
    icons: [
      { src: "/pwa-icon/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa-icon/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/pwa-icon/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
  return new Response(JSON.stringify(manifest), { headers: { "Content-Type": "application/manifest+json" } });
}
