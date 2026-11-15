import { site } from "@/config/site";
import { BookButton } from "@/components/ui/BookButton";

/** Hero piste A1 « Lame » : logo, bande barber pole, titre court, CTA. */
export function Hero() {
  return (
    <section className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6 pt-16 pb-28 text-center nav:pb-16">
      {/* La diagonale du logo se prolonge en un filet qui traverse la page. */}
      <svg aria-hidden className="hero-blade pointer-events-none absolute inset-0 size-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        <line x1="-5" y1="105" x2="105" y2="-5" pathLength={1} />
      </svg>

      <div className="hero-stage relative z-10 flex flex-col items-center px-6 py-10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/logo.svg"
          alt="Dysi Barber"
          width={867}
          height={617}
          fetchPriority="high"
          className="w-[clamp(230px,30vw,430px)] h-auto"
        />
        <div id="hero-pole" className="pole mt-6 mb-6 h-[3px] w-14" aria-hidden />
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
