"use client";

import { useEffect, useRef } from "react";

/** En-tete de section : numero, filet qui se trace, titre geant qui monte d'un masque. Anime a l'entree dans le viewport. */
export function SectionHead({ n, label, className = "" }: { n: string; label: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!("IntersectionObserver" in window)) {
      el.dataset.in = "";
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) {
          el.dataset.in = "";
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} data-head="" className={className}>
      <div className="flex items-center gap-4 text-sm tabular-nums text-fg-muted">
        <span>{n}</span>
        <span aria-hidden data-head-rule className="h-px flex-1 bg-line-strong" />
      </div>
      <h2 className="mt-5 overflow-hidden pb-[0.08em] text-[clamp(3rem,9vw,6.5rem)] font-bold leading-[0.88] tracking-[-0.055em]">
        <span data-head-title className="block">{label}</span>
      </h2>
    </div>
  );
}
