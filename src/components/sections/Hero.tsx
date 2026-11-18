import { site } from "@/config/site";
import { BookButton } from "@/components/ui/BookButton";
import { HeroCut } from "@/components/ui/HeroCut";
import { HeroPole } from "@/components/ui/HeroPole";
import { OpenStatus } from "@/components/widgets/OpenStatus";

/** Hero : wordmark geant tranche par la lame, bande barber pole, statut, CTA. Pas de slogan. */
export function Hero() {
  return (
    <section id="accueil" className="relative isolate flex min-h-dvh flex-col items-center justify-center overflow-hidden px-5 pt-20 pb-28 nav:px-14 nav:pt-24 nav:pb-14">
      <h1 className="sr-only">{site.name}, barber à {site.city}</h1>
      <HeroCut />

      <div className="mt-8 flex flex-col items-center nav:mt-10">
        <HeroPole className="my-0" />
        <p className="mt-6 text-[17px] text-fg-muted nav:hidden">{site.city} · {site.address.district} · Sur rendez-vous</p>
        <div className="mt-8 hidden nav:block">
          <BookButton size="lg" />
        </div>
      </div>

      <div className="absolute inset-x-14 bottom-8 hidden items-center justify-between text-[13px] text-fg-muted nav:flex">
        <p>{site.city} · {site.address.district} · Sur rendez-vous</p>
        <OpenStatus />
      </div>
    </section>
  );
}
