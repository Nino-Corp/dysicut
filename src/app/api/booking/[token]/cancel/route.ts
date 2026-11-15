import { after } from "next/server";
import { cancelByToken, toView } from "@/lib/booking/repo";
import { handleError, NO_STORE } from "@/lib/booking/http";
import { barberNotice, clientCancelled } from "@/lib/email/templates";
import { sendMail } from "@/lib/email/send";

export const dynamic = "force-dynamic";

/** POST /api/booking/<token>/cancel : annulation par le client, sans compte. Libère le créneau immédiatement. */
export async function POST(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  try {
    const { booking, cfg } = await cancelByToken(token);
    after(async () => {
      const notify = process.env.NOTIFY_EMAIL;
      if (notify) await sendMail(barberNotice("cancelled", booking, notify));
      if (booking.email) await sendMail(clientCancelled(booking, "client"));
    });
    return Response.json({ booking: toView(booking, cfg.cancelMinHours) }, { headers: NO_STORE });
  } catch (e) {
    return handleError(e);
  }
}
