"use client";

import { useEffect, useRef, useState } from "react";
import { POLE_H, POLE_W, createPole } from "@/lib/poleRender";

const STORAGE_KEY = "dysicut-intro";
const TOTAL = 2400; // ms
const STRIP_W = 56; // longueur de la bande du hero

/**
 * Intro barber pole (CLAUDE.md section 5.1). Superposition non interactive.
 * Un pole américain (embouts chromés, tube rayé) apparaît au centre sur fond noir, rayures qui montent,
 * puis se couche et rapetisse d'un seul bloc (aucune déformation) jusqu'à la bande #hero-pole.
 * Le noir se lève ensuite et révèle le hero.
 * Activée seulement si html[data-intro="play"] (script inline du <head>) : une fois par session,
 * hors prefers-reduced-motion, accueil uniquement.
 */
export function PoleIntro() {
  const [done, setDone] = useState(false);
  const rig = useRef<HTMLDivElement>(null);
  const back = useRef<HTMLDivElement>(null);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const html = document.documentElement;
    const finish = () => {
      html.dataset.intro = "done";
      setDone(true);
    };
    const target = document.getElementById("hero-pole")?.getBoundingClientRect();
    if (html.dataset.intro !== "play" || !target || !rig.current || !back.current || !root.current) {
      finish();
      return;
    }
    const { innerWidth: w, innerHeight: h } = window;
    // Cible hors écran (scroll restauré par le navigateur) : on saute l'intro.
    if (target.bottom < 0 || target.top > h) {
      try { sessionStorage.setItem(STORAGE_KEY, "1"); } catch {}
      finish();
      return;
    }

    const scroll = createPole(rig.current);
    const cx = target.left + target.width / 2;
    const cy = target.top + target.height / 2;
    const s = Math.min(h * 0.62, w * 1.2) / POLE_H; // le pole occupe ~62 % de la hauteur d'écran
    const sEnd = STRIP_W / POLE_H;
    const dx = w / 2 - cx;
    const dy = h / 2 - cy;

    const el = rig.current;
    el.style.left = `${cx - POLE_W / 2}px`;
    el.style.top = `${cy - POLE_H / 2}px`;

    const start = `translate(${dx}px, ${dy}px) rotate(0deg) scale(${s})`;
    const end = `translate(0px, 0px) rotate(90deg) scale(${sEnd})`;
    const inOut = "cubic-bezier(0.65, 0, 0.35, 1)";
    const t = (ms: number) => ms / TOTAL;
    const opts = { duration: TOTAL, fill: "both" as const, easing: "linear" };

    // Chronologie : 0-0,5 s apparition | 0,5-1,4 s le pole tourne, vertical | 1,4-2,1 s il se couche
    // et rejoint la bande | 2,1-2,4 s le noir se lève, relais avec la vraie bande.
    const anims = [
      el.animate(
        [
          { transform: start, opacity: 0, offset: 0 },
          { transform: start, opacity: 1, offset: t(500) },
          { transform: start, opacity: 1, offset: t(1400), easing: inOut },
          { transform: end, opacity: 1, offset: t(2100) },
          { transform: end, opacity: 1, offset: t(2150) },
          { transform: end, opacity: 0, offset: 1 },
        ],
        opts,
      ),
      back.current.animate([{ opacity: 1 }, { opacity: 1, offset: t(2100) }, { opacity: 0 }], opts),
    ];
    document.querySelector(".hero-blade")?.setAttribute("data-draw", "");

    anims[1]!.onfinish = () => {
      try { sessionStorage.setItem(STORAGE_KEY, "1"); } catch {}
      finish();
    };
    // Les rayures cessent de défiler quand le pole se couche : moins de travail pendant le rapetissement.
    const stop = window.setTimeout(() => scroll?.pause(), 1400);
    return () => {
      window.clearTimeout(stop);
      anims.forEach((a) => a.cancel());
    };
  }, []);

  if (done) return null;

  return (
    <div ref={root} aria-hidden className="intro">
      <div ref={back} className="intro-back" />
      <div ref={rig} className="intro-rig" />
    </div>
  );
}
