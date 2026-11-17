import type { MetadataRoute } from "next";
import { site } from "@/config/site";

// Seulement les pages publiques indexables (pas /admin, /rdv/<jeton>, ni les mentions en noindex).
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: site.url, changeFrequency: "weekly", priority: 1 },
    { url: `${site.url}/reserver`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${site.url}/confidentialite`, changeFrequency: "yearly", priority: 0.2 },
  ];
}
