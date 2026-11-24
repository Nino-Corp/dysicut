"use client";

import { useEffect, useRef, useState } from "react";

const STORAGE_KEY = "dysicut-intro";
const TOTAL = 2420; // duree totale (ms)
const ANGLE = 38; // degres : pente de la lame du logo (bas gauche vers haut droit), la coupe la prolonge
export const CUT_EVENT = "dysicut:cut";

/**
 * Intro « coupe » (CLAUDE.md section 5.1). Superposition non interactive.
 * Le logo (D + DYSI + BARBER) apparait sur noir, un filet le tranche en diagonale, puis les deux moities
 * de l'ecran s'ecartent le long de la coupe pendant que le wordmark du hero (HeroCut) se referme dessous.
 * Activee seulement si html[data-intro="play"] (script inline du <head>) : une fois par session,
 * hors prefers-reduced-motion, accueil uniquement.
 */
export function CutIntro() {
  const [done, setDone] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const a = useRef<HTMLDivElement>(null);
  const b = useRef<HTMLDivElement>(null);
  const line = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const html = document.documentElement;
    const finish = () => {
      html.dataset.intro = "done";
      window.dispatchEvent(new Event(CUT_EVENT)); // au cas ou : libere le hero
      setDone(true);
    };
    const A = a.current;
    const B = b.current;
    const L = line.current;
    if (html.dataset.intro !== "play" || !A || !B || !L) {
      finish();
      return;
    }

    const { innerWidth: w, innerHeight: h } = window;
    // Le logo se pose sur le wordmark du hero (meme centre vertical) : centre sur toute la hauteur, il
    // paraissait trop bas sur telephone (nav en haut, barre rdv et barre Safari en bas).
    const cut = document.querySelector<HTMLElement>(".hero-cut")?.getBoundingClientRect();
    if (cut && cut.height > 0 && cut.bottom > 0 && cut.top < h) {
      const y = `${cut.top + cut.height / 2}px`;
      root.current?.querySelectorAll<HTMLElement>(".intro-logo").forEach((el) => (el.style.top = y));
    }
    const th = (ANGLE * Math.PI) / 180;
    const u = { x: Math.cos(th), y: -Math.sin(th) }; // le long de la coupe (vers le haut droit)
    const n = { x: -Math.sin(th), y: -Math.cos(th) }; // perpendiculaire, cote haut gauche
    // La coupe passe exactement par la lame du logo (centre de la lame a ~53,5 % / 32,7 % de l'image).
    const logo = A.querySelector<HTMLElement>(".intro-logo")?.getBoundingClientRect();
    const cx = logo ? logo.left + logo.width * 0.535 : w / 2;
    const cy = logo ? logo.top + logo.height * 0.327 : h / 2;
    const R = w + h;
    const pt = (px: number, py: number) => `${px}px ${py}px`;
    // Les deux moities se chevauchent de 2 px le long de la coupe : sans ca, l'anticrenelage laisse un
    // fin joint clair (le hero en dessous) visible sur toute la diagonale.
    const OV = 2;
    const base = (dir: number) => {
      const ox = -n.x * OV * dir; // dir = 1 pour la moitie haut gauche : elle deborde cote bas droit
      const oy = -n.y * OV * dir;
      const q1 = pt(cx - u.x * R + ox, cy - u.y * R + oy);
      const q2 = pt(cx + u.x * R + ox, cy + u.y * R + oy);
      const far = (k: number) => [
        pt(cx + u.x * R + n.x * R * k, cy + u.y * R + n.y * R * k),
        pt(cx - u.x * R + n.x * R * k, cy - u.y * R + n.y * R * k),
      ];
      return `polygon(${q1}, ${q2}, ${far(dir).join(", ")})`;
    };
    A.style.clipPath = base(1);
    B.style.clipPath = base(-1);

    L.style.width = `${R * 2}px`;
    L.style.left = `${cx - R}px`;
    L.style.top = `${cy}px`;
    L.style.transform = `rotate(${-ANGLE}deg)`;

    const D = (w * Math.sin(th) + h * Math.cos(th)) / 2 + Math.hypot(cx - w / 2, cy - h / 2) + 48; // ecart perpendiculaire pour quitter l'ecran
    const drift = D * 0.55; // glissement le long de la coupe, comme les moities du hero
    const move = (k: number) => ({
      a: `translate3d(${n.x * D * k - u.x * drift * k}px, ${n.y * D * k - u.y * drift * k}px, 0)`,
      b: `translate3d(${-n.x * D * k + u.x * drift * k}px, ${-n.y * D * k + u.y * drift * k}px, 0)`,
    });
    const t = (ms: number) => ms / TOTAL;
    const opts = { duration: TOTAL, fill: "both" as const, easing: "linear" };
    const inOut = "cubic-bezier(0.7, 0, 0.3, 1)";

    // 0-0,4 s le logo apparait | 0,6-0,95 s le filet tranche | 0,95-2,05 s les moities s'ecartent et se fondent | fin.
    const zero = "translate3d(0px, 0px, 0)";
    const frames = (end: string) => [
      { transform: zero, opacity: 1, offset: 0 },
      { transform: zero, opacity: 1, offset: t(950), easing: inOut },
      { transform: end, opacity: 1, offset: t(1750) },
      { transform: end, opacity: 0, offset: t(2050) },
      { transform: end, opacity: 0, offset: 1 },
    ];
    const anims = [
      A.animate(frames(move(1).a), opts),
      B.animate(frames(move(1).b), opts),
      L.animate(
        [
          { clipPath: "inset(0 100% 0 0)", opacity: 0, offset: 0 },
          { clipPath: "inset(0 100% 0 0)", opacity: 1, offset: t(600) },
          { clipPath: "inset(0 0% 0 0)", opacity: 1, offset: t(950), easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
          { clipPath: "inset(0 0% 0 0)", opacity: 0, offset: t(1350) },
          { clipPath: "inset(0 0% 0 0)", opacity: 0, offset: 1 },
        ],
        opts,
      ),
    ];
    root.current?.querySelectorAll<HTMLElement>(".intro-logo").forEach((el) =>
      anims.push(
        el.animate(
          [
            { opacity: 0, transform: "scale(0.96)", offset: 0 },
            { opacity: 1, transform: "scale(1)", offset: t(400), easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
            { opacity: 1, transform: "scale(1)", offset: 1 },
          ],
          opts,
        ),
      ),
    );

    // Le hero se referme au moment ou la coupe s'ouvre.
    const kick = setTimeout(() => window.dispatchEvent(new Event(CUT_EVENT)), 950);
    anims[0]!.onfinish = () => {
      try { sessionStorage.setItem(STORAGE_KEY, "1"); } catch {}
      finish();
    };
    return () => {
      clearTimeout(kick);
      anims.forEach((x) => x.cancel());
    };
  }, []);

  if (done) return null;

  const logo = (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/brand/logo.svg" alt="" draggable={false} className="intro-logo" />
  );

  return (
    <div ref={root} aria-hidden className="intro">
      <div ref={a} className="intro-half">{logo}</div>
      <div ref={b} className="intro-half">{logo}</div>
      <div ref={line} className="intro-line" />
    </div>
  );
}
