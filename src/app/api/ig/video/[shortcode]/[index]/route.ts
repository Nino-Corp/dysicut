import { findSlide, relay } from "@/lib/instagram/proxy";

const CACHE = "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800";

export async function GET(req: Request, ctx: { params: Promise<{ shortcode: string; index: string }> }) {
  const { shortcode, index } = await ctx.params;
  const slide = await findSlide(shortcode, index);
  if (!slide?.videoUrl) return new Response("Not found", { status: 404 });
  return relay(slide.videoUrl, req, "video", CACHE);
}
