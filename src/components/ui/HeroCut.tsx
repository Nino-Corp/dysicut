"use client";

import { useEffect, useRef } from "react";

/**
 * Logo complet (D + DYSI + BARBER) entier au repos ; il se tranche le long de sa lame au scroll.
 * Au repos (haut de page) les deux moities sont jointes : le logo est entier.
 * Elles glissent l'une contre l'autre le long de la lame uniquement quand on defile.
 * Reduced-motion : logo entier, aucune boucle. La pente doit rester alignee avec les clip-path de globals.css.
 */
const CUT_SLOPE = 1.126; // pente de la lame du D dans le repere du logo (% de hauteur par % de largeur de la boite)

export function HeroCut() {
  const box = useRef<HTMLDivElement>(null);
  const top = useRef<HTMLSpanElement>(null);
  const bottom = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = box.current;
    const a = top.current;
    const b = bottom.current;
    if (!el || !a || !b) return;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

    let slope = 0.12; // pente de la coupe (hauteur / largeur de la boite), recalculee au redimensionnement
    let cur = 0; // part de l'intro : ecartes, ils se referment
    let visible = true;
    let raf = 0;
        // Pendant l'intro, le wordmark reste ecarte jusqu'a la coupe (evenement de CutIntro).
    let hold = document.documentElement.dataset.intro === "play";

    const measure = () => {
      const r = el.getBoundingClientRect();
      slope = (CUT_SLOPE * r.height) / Math.max(1, r.width);
    };
    const set = (s: number) => {
      // Jointes : calque unique, sans clip, pour eviter tout liseré d'antialiasing sur la coupe.
      const whole = Math.abs(s) < 0.4;
      a.style.clipPath = whole ? "none" : "";
      b.style.visibility = whole ? "hidden" : "";
      a.style.transform = `translate3d(${-s}px, ${s * slope}px, 0)`;
      b.style.transform = `translate3d(${s}px, ${-s * slope}px, 0)`;
    };
    const unit = () => Math.min(innerWidth, 1400) / 100; // 1 unite = 1 % de la largeur utile

    const tick = () => {
      raf = 0;
      if (!visible) return;
      const w = unit();
      const scroll = Math.min(scrollY, innerHeight) * 0.22;
      const target = scroll;
      if (!hold) cur += (target - cur) * 0.07;
      // `cur` demarre grand (intro) puis converge : en unites de largeur au depart.
      set(cur);
      raf = requestAnimationFrame(tick);
    };
    const kick = () => {
      if (!raf && !reduce) raf = requestAnimationFrame(tick);
    };

    measure();
    if (reduce) {
      set(0);
    } else {
      cur = unit() * 14; // depart ecarte
      set(cur);
      kick();
    }

    const onResize = () => measure();
    const release = () => {
      hold = false;
    };
    const failsafe = setTimeout(release, 3000);
    addEventListener("dysicut:cut", release);
    const io = new IntersectionObserver(([e]) => {
      visible = !!e?.isIntersecting;
      if (visible) kick();
    });
    io.observe(el);
    addEventListener("resize", onResize);
    return () => {
      clearTimeout(failsafe);
      removeEventListener("dysicut:cut", release);
      cancelAnimationFrame(raf);
      io.disconnect();
      removeEventListener("resize", onResize);
    };
  }, []);

  const logo = (
    // eslint-disable-next-line @next/next/no-img-element -- SVG vectoriel, decoratif (le h1 sr-only porte le nom)
    <img src="/brand/logo.svg" alt="" width={867} height={617} decoding="async" draggable={false} className="block h-auto w-full" />
  );

  return (
    <div ref={box} className="hero-cut relative select-none">
      <span ref={top} aria-hidden className="hero-cut-layer hero-cut-a block will-change-transform">
        {logo}
      </span>
      <span ref={bottom} aria-hidden className="hero-cut-layer hero-cut-b absolute inset-0 block will-change-transform">
        {logo}
      </span>
    </div>
  );
}
