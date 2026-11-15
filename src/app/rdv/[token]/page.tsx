import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BookingDetails } from "@/components/booking/BookingDetails";
import { BookingShell } from "@/components/booking/BookingShell";
import { ManageActions } from "@/components/booking/ManageActions";
import { findByToken, getConfig, toView } from "@/lib/booking/repo";

// Page privée (le jeton est dans l'URL) : jamais indexée, et l'URL n'est pas transmise aux sites externes.
export const metadata: Metadata = { title: "Mon rendez-vous", robots: { index: false, follow: false }, referrer: "no-referrer" };
export const dynamic = "force-dynamic";

export default async function Rdv({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const b = await findByToken(token).catch(() => null);
  if (!b) notFound();
  const cfg = await getConfig();
  const view = toView(b, cfg.cancelMinHours);

  return (
    <BookingShell>
      <h1 className="mt-4 text-[clamp(2rem,8vw,3rem)] font-bold tracking-[-0.04em]">Mon rendez-vous</h1>
      <BookingDetails className="mt-8" startsAt={view.startsAt} endsAt={view.endsAt} serviceName={view.serviceName} priceEur={view.priceEur} />
      <div className="mt-8">
        <ManageActions token={token} booking={view} />
      </div>
    </BookingShell>
  );
}
