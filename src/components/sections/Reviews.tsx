import { reviews } from "@/config/reviews";
import { SectionHead } from "@/components/ui/SectionHead";
import { Reveal } from "@/components/ui/Reveal";

const EMPTY_SLOTS = 3;

export function Reviews() {
  // Pas d'emplacements vides : la section n'apparait que quand il y a de vrais avis.
  if (reviews.length === 0) return null;
  return (
    <section id="avis" className="scroll-mt-4 border-t border-line px-5 py-24 nav:flex nav:min-h-dvh nav:flex-col nav:justify-center nav:px-14 nav:py-20">
      <div className="mx-auto w-full max-w-[1400px]">
        <SectionHead n="04" label="Avis" />

        <ul className="mt-12 grid gap-3 nav:grid-cols-3 nav:gap-5">
          {reviews.length > 0
            ? reviews.map((r, i) => (
                <Reveal as="li" key={`${r.author}-${i}`} delay={i * 0.06} className="flex flex-col justify-between gap-8 rounded-card bg-surface-2 p-6">
                  <blockquote className="text-[17px] leading-relaxed">{r.text}</blockquote>
                  <p className="text-sm text-fg-muted">
                    {r.author} · {r.source}
                  </p>
                </Reveal>
              ))
            : Array.from({ length: EMPTY_SLOTS }, (_, i) => (
                <Reveal as="li" key={i} delay={i * 0.06} className="flex min-h-48 flex-col justify-between gap-8 rounded-card border border-line p-6" >
                  <div className="space-y-3" aria-hidden>
                    <div className="h-3 w-full rounded-full bg-surface-2" />
                    <div className="h-3 w-5/6 rounded-full bg-surface-2" />
                    <div className="h-3 w-2/3 rounded-full bg-surface-2" />
                  </div>
                  <p className="text-sm text-fg-muted">Avis à venir</p>
                </Reveal>
              ))}
        </ul>
      </div>
    </section>
  );
}
