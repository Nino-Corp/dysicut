import { after } from "next/server";
import { bookingRequestSchema } from "@/lib/booking/schema";
import { createBooking, toView } from "@/lib/booking/repo";
import { handleError, jsonError, NO_STORE } from "@/lib/booking/http";
import { hashIp } from "@/lib/booking/token";
import { barberNotice, clientConfirmation, manageUrl } from "@/lib/email/templates";
import { sendMail } from "@/lib/email/send";

export const dynamic = "force-dynamic";

/** POST /api/booking : crée un rdv confirmé automatiquement. */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("INVALID");
  }
  const parsed = bookingRequestSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("INVALID", parsed.error.issues[0]?.message);
  }
  const input = parsed.data;
  if (input.website) return jsonError("INVALID"); // honeypot rempli : bot

  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? req.headers.get("x-real-ip");
    const { booking, token, cfg } = await createBooking({
      serviceId: input.serviceId,
      start: new Date(input.start),
      firstName: input.firstName,
      phone: input.phone,
      email: input.email,
      ipHash: hashIp(ip),
    });

    // Emails après la réponse : le client n'attend pas Resend.
    after(async () => {
      const notify = process.env.NOTIFY_EMAIL;
      if (notify) await sendMail(barberNotice("new", booking, notify));
      if (booking.email) await sendMail(clientConfirmation(booking, token));
    });

    return Response.json({ token, manageUrl: manageUrl(token), booking: toView(booking, cfg.cancelMinHours) }, { status: 201, headers: NO_STORE });
  } catch (e) {
    return handleError(e);
  }
}
