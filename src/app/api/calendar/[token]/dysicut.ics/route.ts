import { timingSafeEqual } from "node:crypto";
import { site } from "@/config/site";
import { db, dbConfigured } from "@/lib/db/supabase";
import { buildIcs, type IcsEvent } from "@/lib/booking/ics";
import { formatPhone } from "@/lib/booking/phone";
import type { BookingRow } from "@/lib/booking/repo";

export const dynamic = "force-dynamic";

const headers = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow", "Referrer-Policy": "no-referrer" };
const notFound = () => new Response("Not found", { status: 404, headers });

/**
 * Flux iCal prive du barber : l'URL contient un jeton secret (regenerable dans /admin/reglages).
 * Rdv confirmes (60 jours en arriere, tout le futur) + conges. Aucune autre authentification : c'est le principe d'un abonnement calendrier.
 */
export async function GET(_: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!dbConfigured() || !/^[0-9a-f]{64}$/.test(token)) return notFound();

  const { data: s } = await db().from("booking_settings").select("ical_token").eq("id", 1).maybeSingle();
  const want = Buffer.from(s?.ical_token ?? "");
  const got = Buffer.from(token);
  if (!want.length || want.length !== got.length || !timingSafeEqual(want, got)) return notFound();

  const since = new Date(Date.now() - 60 * 86_400_000).toISOString();
  const [b, t] = await Promise.all([
    db().from("bookings").select("*").eq("status", "confirmed").gt("ends_at", since).order("starts_at"),
    db().from("time_off").select("*").gt("ends_at", since).order("starts_at"),
  ]);
  if (b.error || t.error) return new Response("Service unavailable", { status: 503, headers });

  const events: IcsEvent[] = [
    ...((b.data ?? []) as BookingRow[]).map((r) => ({
      uid: `${r.id}@dysicut`,
      start: new Date(r.starts_at),
      end: new Date(r.ends_at),
      summary: `${r.first_name} - ${r.service_name}`,
      description: [`Tel : ${formatPhone(r.phone)}`, r.email ? `Email : ${r.email}` : null, `Prix : ${r.price_cents / 100} EUR`, `${site.url}/admin/rdv/${r.id}`].filter(Boolean).join("\n"),
      alarmMin: 15,
    })),
    ...(t.data ?? []).map((r: { id: number; starts_at: string; ends_at: string; reason: string | null }) => ({
      uid: `off-${r.id}@dysicut`,
      start: new Date(r.starts_at),
      end: new Date(r.ends_at),
      summary: r.reason ? `Bloque : ${r.reason}` : "Bloque",
    })),
  ];

  return new Response(buildIcs(events, { name: `${site.name} - rdv` }), {
    headers: { ...headers, "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": 'inline; filename="dysicut.ics"' },
  });
}
