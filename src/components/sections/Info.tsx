import { HoverButton } from "@/components/ui/HoverButton";
import { site } from "@/config/site";
import { HoursList } from "@/components/widgets/HoursList";
import { MapEmbed } from "@/components/widgets/MapEmbed";
import { OpenStatus } from "@/components/widgets/OpenStatus";

// Adresse provisoire (site.address.confirmed = false) : affichée ici seulement, jamais dans le JSON-LD/SEO.
// TODO adresse exacte : remplacer le panneau par une image statique de carte une fois l'adresse confirmée.
const { street, postalCode, city, coords } = site.address;
const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${street}, ${postalCode} ${city}`)}`;

export function Info() {
  return (
    <section id="infos" className="scroll-mt-4 border-t border-line px-5 py-24 nav:px-14 nav:py-32">
      <div className="mx-auto max-w-[1400px]">
        <h2 className="text-[clamp(2.25rem,6vw,4.5rem)] font-bold tracking-[-0.04em]">Infos</h2>
        <p className="mt-4 max-w-md text-[17px] text-fg-muted">Un studio, uniquement sur rendez-vous.</p>

        <div className="mt-12 grid gap-10 nav:grid-cols-2 nav:gap-20">
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold tracking-tight">Horaires</h3>
              <OpenStatus />
            </div>
            <HoursList />
          </div>

          <div>
            <h3 className="mb-4 text-xl font-semibold tracking-tight">Adresse</h3>
            <MapEmbed lat={coords.lat} lon={coords.lon} mapsUrl={mapsUrl} />
            <p className="mt-5 text-[17px]">
              {street}
              <br />
              {postalCode} {city}
            </p>
            <HoverButton href={mapsUrl} target="_blank" variant="ghost" className="mt-5">
              Y aller
            </HoverButton>
          </div>
        </div>
      </div>
    </section>
  );
}
