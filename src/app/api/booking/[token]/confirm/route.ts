import { confirmAttendance, getConfig, toView } from "@/lib/booking/repo";
import { handleError, NO_STORE } from "@/lib/booking/http";

export const dynamic = "force-dynamic";

/** POST /api/booking/<token>/confirm : le client confirme sa venue. POST (pas GET) pour qu'un antivirus de messagerie qui ouvre les liens ne confirme pas à sa place. */
export async function POST(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  try {
    const b = await confirmAttendance(token);
    const cfg = await getConfig();
    return Response.json({ booking: toView(b, cfg.cancelMinHours) }, { headers: NO_STORE });
  } catch (e) {
    return handleError(e);
  }
}
