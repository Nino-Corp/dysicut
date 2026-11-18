import { defaultServices } from "@/config/site";
import { getConfig } from "@/lib/booking/repo";
import { BookButton } from "@/components/ui/BookButton";
import { SectionHead } from "@/components/ui/SectionHead";
import { Reveal } from "@/components/ui/Reveal";

// Prix lus en base (editables dans /admin) ; repli sur defaultServices (valeurs fictives, TODO tarifs réels).
export async function Pricing() {
  const services = await getConfig()
    .then((c) => c.services)
    .catch(() => defaultServices);
  return (
    <section id="tarifs" className="scroll-mt-4 border-t border-line px-5 py-24 nav:flex nav:min-h-dvh nav:flex-col nav:justify-center nav:px-14 nav:py-20">
      <div className="mx-auto w-full max-w-[1400px]">
        <SectionHead n="02" label="Tarifs" />

        <ul className="mt-10 border-t border-line nav:mt-10">
          {services.map((s, i) => (
            <Reveal as="li" key={s.id} delay={i * 0.05} className="menu-row flex items-baseline justify-between gap-6 border-b border-line py-6 nav:py-6">
              <span className="min-w-0">
                <span data-menu-name className="block text-[clamp(1.75rem,4.5vw,3.25rem)] font-semibold leading-none tracking-[-0.04em]">
                  {s.name}
                </span>
                <span className="mt-2 block text-sm tabular-nums text-fg-muted nav:hidden">{s.durationMin} min</span>
              </span>
              <span className="flex shrink-0 items-baseline gap-3 nav:gap-8">
                <span className="hidden whitespace-nowrap text-sm tabular-nums text-fg-muted nav:inline">{s.durationMin} min</span>
                <span className="text-[clamp(1.75rem,4.5vw,3.25rem)] font-semibold leading-none tabular-nums tracking-[-0.04em]">{s.priceEur}&nbsp;€</span>
              </span>
            </Reveal>
          ))}
        </ul>

        <BookButton size="lg" className="mt-8 hidden nav:inline-flex" />
      </div>
    </section>
  );
}
