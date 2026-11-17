import type { Metadata } from "next";
import { site } from "@/config/site";
import { HoverButton } from "@/components/ui/HoverButton";
import { BookingFlow } from "@/components/booking/BookingFlow";
import { BookingShell } from "@/components/booking/BookingShell";
import { getConfig, type BookingConfig } from "@/lib/booking/repo";

export const metadata: Metadata = { title: "Prendre rdv", description: `Réserve ton créneau chez ${site.name}, ${site.city}.` };

// Lit les prestations en base à chaque visite : un changement fait dans /admin est visible tout de suite.
export const dynamic = "force-dynamic";

export default async function Reserver() {
  let cfg: BookingConfig | null = null;
  try {
    cfg = await getConfig();
  } catch {
    cfg = null;
  }

  return (
    <BookingShell>
      {cfg?.enabled && cfg.services.length > 0 ? (
        <BookingFlow services={cfg.services} />
      ) : (
        <section>
          <h1 className="mt-8 text-[clamp(2rem,8vw,3rem)] font-bold tracking-[-0.04em]">Réservation indisponible</h1>
          <p className="mt-4 text-[17px] text-fg-muted">La réservation en ligne est fermée pour le moment. Écris-nous en message pour prendre rdv.</p>
          <HoverButton href={site.social.instagramDm} target="_blank" size="lg" className="mt-8">
            Écrire sur Instagram
          </HoverButton>
        </section>
      )}
    </BookingShell>
  );
}
