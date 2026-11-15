import { defaultServices } from "@/config/site";
import { BookButton } from "@/components/ui/BookButton";
import { Reveal } from "@/components/ui/Reveal";

// TODO tarifs réels : les prix viennent de defaultServices (valeurs fictives).
export function Pricing() {
  return (
    <section id="tarifs" className="scroll-mt-4 border-t border-line px-5 py-24 nav:px-14 nav:py-32">
      <div className="mx-auto grid max-w-[1400px] gap-12 nav:grid-cols-[1fr_1.2fr] nav:gap-20">
        <div>
          <h2 className="text-[clamp(2.25rem,6vw,4.5rem)] font-bold tracking-[-0.04em]">Tarifs</h2>
          <p className="mt-4 max-w-md text-[17px] text-fg-muted">Sur rendez-vous, 40 minutes par client.</p>
          <BookButton size="lg" className="mt-8 hidden nav:inline-flex" />
        </div>

        <div>
          <ul className="border-t border-line">
            {defaultServices.map((s, i) => (
              <Reveal as="li" key={s.id} delay={i * 0.05} className="flex min-h-[72px] items-baseline justify-between gap-4 border-b border-line py-5">
                <div>
                  <span className="text-xl font-semibold tracking-tight nav:text-2xl">{s.name}</span>
                  <span className="mt-1 block text-sm text-fg-muted">{s.durationMin} min</span>
                </div>
                <span className="text-xl font-semibold tabular-nums tracking-tight nav:text-2xl">{s.priceEur} €</span>
              </Reveal>
            ))}
          </ul>
          <BookButton size="lg" className="mt-8 w-full nav:hidden" />
        </div>
      </div>
    </section>
  );
}
