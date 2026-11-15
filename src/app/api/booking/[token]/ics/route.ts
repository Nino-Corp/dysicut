import { findByToken } from "@/lib/booking/repo";
import { handleError, jsonError } from "@/lib/booking/http";
import { calendarFile } from "@/lib/email/templates";

export const dynamic = "force-dynamic";

/** GET /api/booking/<token>/ics : fichier calendrier du rdv (pour qui n'a pas donné d'email). */
export async function GET(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  try {
    const b = await findByToken(token);
    if (!b || b.status !== "confirmed") return jsonError("NOT_FOUND");
    return new Response(calendarFile(b, token), {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'attachment; filename="rdv-dysicut.ics"',
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return handleError(e);
  }
}
