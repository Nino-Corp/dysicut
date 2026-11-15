import { findSlide, relay } from "@/lib/instagram/proxy";

// Les URLs du CDN Instagram expirent : on relaie l'image et le CDN Vercel la garde longtemps.
const CACHE = "public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000";

export async function GET(req: Request, ctx: { params: Promise<{ shortcode: string; index: string }> }) {
  const { shortcode, index } = await ctx.params;
  const slide = await findSlide(shortcode, index);
  if (!slide) return new Response("Not found", { status: 404 });
  return relay(slide.imageUrl, req, "image", CACHE);
}
