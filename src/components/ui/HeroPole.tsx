"use client";

import { useEffect, useRef } from "react";
import { POLE_H, POLE_W, createPole } from "@/lib/poleRender";

const HERO_LENGTH = 112; // longueur de la bande du hero (px), identique à l'arrivée de l'intro

/**
 * Bande du hero : le même pole que l'intro (embouts chromés, tube rayé et ombré), couché et réduit.
 * L'intro vise #hero-pole et se pose exactement dessus (anchor=false : même bande ailleurs, sans l'id).
 */
export function HeroPole({ anchor = true, className = "mt-7 mb-7", length = HERO_LENGTH }: { anchor?: boolean; className?: string; length?: number } = {}) {
  const LENGTH = length;
  const S = LENGTH / POLE_H;
  const THICK = Math.round(POLE_W * S * 10) / 10;
  const rig = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!rig.current) return;
    const scroll = createPole(rig.current);
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) scroll?.pause();
  }, []);

  return (
    <div id={anchor ? "hero-pole" : undefined} aria-hidden className={`relative ${className}`} style={{ width: LENGTH, height: THICK }}>
      <div
        ref={rig}
        className="absolute"
        style={{
          width: POLE_W,
          height: POLE_H,
          left: LENGTH / 2 - POLE_W / 2,
          top: THICK / 2 - POLE_H / 2,
          transform: `rotate(90deg) scale(${S})`,
          transformOrigin: "50% 50%",
        }}
      />
    </div>
  );
}
