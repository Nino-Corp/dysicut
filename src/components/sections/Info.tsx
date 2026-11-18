import { HoverButton } from "@/components/ui/HoverButton";
import { site } from "@/config/site";
import { SectionHead } from "@/components/ui/SectionHead";
import { HoursList } from "@/components/widgets/HoursList";
import { MapEmbed } from "@/components/widgets/MapEmbed";
import { OpenStatus } from "@/components/widgets/OpenStatus";

// Adresse provisoire (site.address.confirmed = false) : affichée ici seulement, jamais dans le JSON-LD/SEO.
// TODO adresse exacte : remplacer le panneau par une image statique de carte une fois l'adresse confirmée.
const { street, postalCode, city, coords } = site.address;
const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${street}, ${postalCode} ${city}`)}`;

export function Info() {
  return (
    <section id="infos" className="scroll-mt-4 border-t border-line px-5 py-24 nav:flex nav:min-h-dvh nav:flex-col nav:justify-center nav:px-14 nav:py-20">
      <div className="mx-auto w-full max-w-[1400px]">
        <SectionHead n="03" label="Infos" />

        <div className="mt-12 grid gap-10 nav:mt-14 nav:grid-cols-2 nav:gap-20">
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
