import "server-only";
import { getCachedPosts } from "./feed";
import { isAllowedMediaUrl, type IgSlide } from "./scrape";

const CODE_RE = /^[A-Za-z0-9_-]{6,20}$/;

/** Retrouve une slide dans le flux en cache, ou null (paramètres invalides, post disparu, flux indisponible). */
export async function findSlide(shortcode: string, index: string): Promise<IgSlide | null> {
  const i = Number(index);
  if (!CODE_RE.test(shortcode) || !Number.isInteger(i) || i < 0 || i > 20) return null;
  try {
    const post = (await getCachedPosts()).find((p) => p.shortcode === shortcode);
    return post?.slides?.[i] ?? null;
  } catch (e) {
    console.error("[ig] flux indisponible", e);
    return null;
  }
}

/** Relaye un média du CDN Instagram (liste blanche d'hôtes), Range compris pour les vidéos. */
export async function relay(url: string, req: Request, kind: "image" | "video", cache: string): Promise<Response> {
  if (!isAllowedMediaUrl(url)) return new Response("Not found", { status: 404 });
  try {
    const range = req.headers.get("range");
    const upstream = await fetch(url, {
      headers: range && kind === "video" ? { Range: range } : undefined,
      signal: AbortSignal.timeout(kind === "video" ? 20000 : 8000),
      cache: "no-store",
    });
    const type = upstream.headers.get("content-type") ?? "";
    if (!(upstream.status === 200 || upstream.status === 206) || !type.startsWith(`${kind}/`)) {
      return new Response("Bad gateway", { status: 502, headers: { "Cache-Control": "no-store" } });
    }
    const headers = new Headers({ "Content-Type": type, "Cache-Control": cache, "Accept-Ranges": "bytes" });
    for (const h of ["content-length", "content-range"]) {
      const v = upstream.headers.get(h);
      if (v) headers.set(h, v);
    }
    return new Response(upstream.body, { status: upstream.status, headers });
  } catch {
    return new Response("Bad gateway", { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
