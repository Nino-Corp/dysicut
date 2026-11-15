/**
 * Fige les derniers posts Instagram dans le dépôt (images dans public/cuts, métadonnées dans
 * src/config/instagram-snapshot.json). C'est le repli ultime du site si Instagram bloque.
 * Usage : pnpm ig:snapshot (Node >= 23.6). À relancer de temps en temps ; commit des fichiers générés.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { altFromCaption, scrapePublicPosts } from "../src/lib/instagram/scrape.ts";

const HANDLE = "dysicutz";
const posts = await scrapePublicPosts(HANDLE);
await mkdir("public/cuts", { recursive: true });

const out = [];
for (const p of posts) {
  const res = await fetch(p.imageUrl, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) {
    console.warn(`image ignoree (${res.status}) : ${p.shortcode}`);
    continue;
  }
  const file = `ig-${p.shortcode}.jpg`;
  await writeFile(`public/cuts/${file}`, Buffer.from(await res.arrayBuffer()));
  out.push({
    shortcode: p.shortcode,
    src: `/cuts/${file}`,
    alt: altFromCaption(p.caption, "Coupe réalisée par Dysicut, Marseille"),
    isVideo: p.isVideo,
    isCarousel: p.isCarousel,
    width: p.width,
    height: p.height,
  });
}
await writeFile("src/config/instagram-snapshot.json", JSON.stringify({ generatedAt: new Date().toISOString(), posts: out }, null, 2) + "\n");
console.log(`${out.length} posts figes.`);
