import { site } from "@/config/site";
import { BookButton } from "@/components/ui/BookButton";
import { BladeSheen } from "@/components/ui/BladeSheen";
import { HeroPole } from "@/components/ui/HeroPole";

/** Hero piste A1 « Lame » : logo, bande barber pole, titre court, CTA. */
export function Hero() {
  return (
    <section className="relative isolate flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6 pt-16 pb-28 text-center nav:pb-16">
      {/* Filet : diagonale de coin à coin du hero (bas gauche vers haut droit), quelle que soit la taille d'écran. */}
      <svg aria-hidden className="hero-blade pointer-events-none absolute inset-x-0 bottom-0 -z-20 w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        <line x1="0" y1="100" x2="100" y2="0" pathLength={1} />
      </svg>

      {/* Ombre plein cadre (comme la maquette) : le filet s'estompe autour du logo au lieu d'être coupé net. */}
      <div aria-hidden className="hero-shade pointer-events-none absolute inset-0" />

      <div className="relative flex flex-col items-center px-6 py-10">
        <div className="relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/logo.svg"
          alt="Dysi Barber"
          width={867}
          height={617}
          fetchPriority="high"
          className="relative w-[clamp(230px,30vw,430px)] h-auto"
        />
        <svg aria-hidden viewBox="106 171 867 617" className="pointer-events-none absolute inset-0 h-full w-full">
          <BladeSheen />
        </svg>
        </div>
        <HeroPole />
        <h1 className="text-[clamp(2rem,5vw,3.75rem)] font-bold tracking-[-0.04em]">
          Une coupe nette.
          <br />
          Rien de plus.
        </h1>
        <p className="mt-3 mb-7 text-[clamp(1rem,1.6vw,1.25rem)] text-fg-muted">{site.city} · sur rendez-vous</p>
        <BookButton size="lg" />
      </div>
    </section>
  );
}
