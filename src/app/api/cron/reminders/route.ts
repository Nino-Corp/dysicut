import { db, dbConfigured } from "@/lib/db/supabase";
import { addDays, parisDateKey, parisToUtc, dayLabel, timeLabel } from "@/lib/booking/time";
import type { BookingRow } from "@/lib/booking/repo";
import { clientReminder, manageUrl } from "@/lib/email/templates";
import { sendMail } from "@/lib/email/send";
import { getSmsProvider } from "@/lib/sms/provider";
import { cronAuthorized } from "@/lib/booking/cron-auth";

export const dynamic = "force-dynamic";

/**
 * Cron quotidien (vercel.json, ~17h-18h Paris) :
 *  - rappel EMAIL la veille, uniquement si le client a donné un email et a réservé plus de 24 h à l'avance ;
 *  - rappel SMS : branche prête mais inerte tant que getSmsProvider().enabled est false ;
 *  - purge des rdv de plus de 12 mois (durée de conservation annoncée dans les mentions légales).
 * Vercel envoie automatiquement `Authorization: Bearer $CRON_SECRET`.
 */
export async function GET(req: Request) {
  if (!cronAuthorized(req)) return new Response("Unauthorized", { status: 401 });
  if (!dbConfigured()) return Response.json({ ok: false, error: "db" }, { status: 503 });

  const tomorrow = addDays(parisDateKey(new Date()), 1);
  const from = parisToUtc(tomorrow, "00:00");
  const to = parisToUtc(addDays(tomorrow, 1), "00:00");

  const { data, error } = await db().from("bookings").select("*").eq("status", "confirmed").gte("starts_at", from.toISOString()).lt("starts_at", to.toISOString());
  if (error) {
    console.error("[cron] lecture des rdv", error);
    return Response.json({ ok: false }, { status: 500 });
  }

  const sms = getSmsProvider();
  let emails = 0;
  let smsCount = 0;
  for (const b of (data ?? []) as BookingRow[]) {
    const leadMs = new Date(b.starts_at).getTime() - new Date(b.created_at).getTime();
    if (leadMs < 24 * 3_600_000) continue; // pris à moins de 24 h : pas de rappel

    if (b.email && !b.email_reminder_sent_at) {
      if (await sendMail(clientReminder(b, b.cancel_token))) {
        emails++;
        const sentAt = new Date().toISOString();
        await db().from("bookings").update({ email_reminder_sent_at: sentAt, confirmation_requested_at: sentAt }).eq("id", b.id);
      }
    }

    if (sms.enabled && !b.sms_reminder_sent_at) {
      const s = new Date(b.starts_at);
      const body = `Dysicut : rdv demain ${dayLabel(s)} a ${timeLabel(s)}. Annuler : ${manageUrl(b.cancel_token)}`;
      if ((await sms.send(b.phone, body)).ok) {
        smsCount++;
        await db().from("bookings").update({ sms_reminder_sent_at: new Date().toISOString() }).eq("id", b.id);
      }
    }
  }

  // Réservations provisoires dont l'acompte n'est jamais venu : on les clôt (elles ne bloquaient déjà plus le créneau).
  await db().from("bookings").update({ status: "expired", payment_status: "none" }).eq("status", "pending_payment").lt("hold_expires_at", new Date().toISOString());

  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - 12);
  const purged = await db().from("bookings").delete({ count: "exact" }).lt("ends_at", cutoff.toISOString());

  return Response.json({ ok: true, emails, sms: smsCount, purged: purged.count ?? 0 });
}
