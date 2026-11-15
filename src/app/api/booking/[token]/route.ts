import { findByToken, getConfig, toView } from "@/lib/booking/repo";
import { handleError, jsonError, NO_STORE } from "@/lib/booking/http";

export const dynamic = "force-dynamic";

/** GET /api/booking/<token> : état du rdv (sert au bandeau « Mon rendez-vous »). */
export async function GET(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  try {
    const b = await findByToken(token);
    if (!b) return jsonError("NOT_FOUND");
    const cfg = await getConfig();
    return Response.json({ booking: toView(b, cfg.cancelMinHours) }, { headers: NO_STORE });
  } catch (e) {
    return handleError(e);
  }
}
