import { db, dbConfigured } from "@/lib/db/supabase";
import { addDays, parisDateKey, parisToUtc } from "@/lib/booking/time";
import type { BookingRow } from "@/lib/booking/repo";
import { shouldRelease } from "@/lib/booking/attendance";
import { cronAuthorized } from "@/lib/booking/cron-auth";
import { clientCancelled } from "@/lib/email/templates";
import { sendMail } from "@/lib/email/send";

export const dynamic = "force-dynamic";

/**
 * Cron quotidien (vercel.json, ~7h30-8h30 Paris) : libère les rdv du jour dont le client n'a pas confirmé sa venue,
 * alors qu'il a reçu la demande la veille. Jamais touchés : rdv ajoutés à la main, rdv avec acompte payé, rdv sans
 * demande envoyée (client sans email, rdv pris moins de 24 h à l'avance), rdv qui commencent dans moins de 2 h.
 * Le client reçoit un email pour reprendre rdv s'il vient quand même.
 */
export async function GET(req: Request) {
  if (!cronAuthorized(req)) return new Response("Unauthorized", { status: 401 });
  if (!dbConfigured()) return Response.json({ ok: false, error: "db" }, { status: 503 });

  const today = parisDateKey(new Date());
  const from = parisToUtc(today, "00:00");
  const to = parisToUtc(addDays(today, 1), "00:00");

  const { data, error } = await db()
    .from("bookings")
    .select("*")
    .eq("status", "confirmed")
    .not("confirmation_requested_at", "is", null)
    .is("attendance_confirmed_at", null)
    .gte("starts_at", from.toISOString())
    .lt("starts_at", to.toISOString());
  if (error) {
    console.error("[cron] confirmations : lecture des rdv", error);
    return Response.json({ ok: false }, { status: 500 });
  }

  const now = new Date();
  let released = 0;
  for (const b of (data ?? []) as BookingRow[]) {
    if (!shouldRelease(b, now)) continue;
    // Condition sur le statut et l'absence de confirmation : un client qui confirme à cet instant n'est pas libéré.
    const upd = await db()
      .from("bookings")
      .update({ status: "cancelled_client", cancelled_at: now.toISOString() })
      .eq("id", b.id)
      .eq("status", "confirmed")
      .is("attendance_confirmed_at", null)
      .select("*")
      .maybeSingle();
    if (upd.error || !upd.data) continue;
    released++;
    const row = upd.data as BookingRow;
    if (row.email) await sendMail(clientCancelled(row, "unconfirmed"));
  }
  return Response.json({ ok: true, released });
}
