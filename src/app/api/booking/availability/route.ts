import { getAvailability } from "@/lib/booking/repo";
import { handleError, jsonError, NO_STORE } from "@/lib/booking/http";
import { timeLabel } from "@/lib/booking/time";

export const dynamic = "force-dynamic";

/** GET /api/booking/availability?service=coupe -> jours (Paris) avec créneaux libres. Aucune donnée client. */
export async function GET(req: Request) {
  const serviceId = new URL(req.url).searchParams.get("service");
  if (!serviceId) return jsonError("INVALID");
  try {
    const { service, days } = await getAvailability(serviceId);
    return Response.json(
      {
        service,
        days: days.map((d) => ({ date: d.date, slots: d.slots.map((s) => ({ start: s.toISOString(), label: timeLabel(s) })) })),
      },
      { headers: NO_STORE },
    );
  } catch (e) {
    return handleError(e);
  }
}
