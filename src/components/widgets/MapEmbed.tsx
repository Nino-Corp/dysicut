"use client";

import { useEffect, useRef, useState } from "react";
import type { StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

// Fond de carte vectoriel OpenFreeMap (gratuit, sans clé). Le style est recoloré à la volée avec les tokens du site.
const STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";
const ZOOM = 15.8;

// Couches retirées : limites, aéroports, écussons de routes, pays/états/capitales (inutiles à cette échelle).
const DROP = /^(natural_earth|building-3d|boundary|aeroway|airport|highway-shield|road_shield|road_one_way|poi|label_(state|country|city))|hatching/;

type Layer = { id: string; type: string; paint?: Record<string, unknown>; layout?: Record<string, unknown> };

/** Applique la DA : noir, rues en filets fins, noms de rues et de quartiers en gris discret. */
function theme(style: { layers: Layer[] }): StyleSpecification {
  const css = getComputedStyle(document.documentElement);
  const v = (name: string) => css.getPropertyValue(name).trim();
  const land = v("--map-land");
  const park = v("--map-park");
  const water = v("--map-water");
  const building = v("--map-building");
  const road = v("--map-road");
  const roadMajor = v("--map-road-major");
  const label = v("--map-label");
  const fg = v("--fg");

  style.layers = style.layers
    .filter((l) => !DROP.test(l.id))
    .map((l) => {
      const paint: Record<string, unknown> = {};
      if (l.type === "background") paint["background-color"] = land;
      else if (l.type === "fill") {
        paint["fill-color"] = l.id === "building" ? building : l.id === "water" ? water : /^(park|landcover_(wood|grass|wetland))/.test(l.id) ? park : land;
        paint["fill-opacity"] = 1;
        paint["fill-outline-color"] = "transparent";
      } else if (l.type === "symbol") {
        // Noms de rues et de quartiers : sobres, halo de la couleur du sol.
        paint["text-color"] = l.id.startsWith("label") ? fg : label;
        paint["text-halo-color"] = land;
        paint["text-halo-width"] = 1.5;
        paint["text-opacity"] = 1;
      } else if (l.type === "line") {
        const casing = l.id.includes("casing") || l.id.includes("outline");
        const major = /major|motorway|trunk|primary|secondary|tertiary/.test(l.id);
        paint["line-color"] = casing ? "transparent" : major ? roadMajor : road;
        paint["line-opacity"] = casing ? 0 : 1;
      }
      return { ...l, paint: { ...l.paint, ...paint } };
    });
  return style as unknown as StyleSpecification;
}

/** Repère façon Apple Plans, en vectoriel : bille sur aiguille, ombre au sol. La pointe est en bas du viewBox. */
function AppleStylePin({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 46" aria-hidden className={className}>
      <ellipse cx="16" cy="46" rx="7" ry="2.2" className="fill-black/50" />
      <path d="M13.6 26 L16 46 L18.4 26 Z" className="fill-fg" />
      <circle cx="16" cy="15" r="14" className="fill-fg" />
      <circle cx="16" cy="15" r="5.2" className="fill-surface" />
    </svg>
  );
}

/**
 * Carte stylisée aux couleurs du site : non interactive, noms de rues, pin Heroicons au centre.
 * Chargée seulement quand elle approche de l'écran. Un clic ouvre Google Maps.
 */
export function MapEmbed({ lat, lon, mapsUrl }: { lat: number; lon: number; mapsUrl: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [image, setImage] = useState<string | null>(null);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    let map: import("maplibre-gl").Map | undefined;
    let cancelled = false;

    const start = async () => {
      try {
        const [maplibregl, style] = await Promise.all([
          import("maplibre-gl"),
          fetch(STYLE_URL).then((r) => r.json()),
        ]);
        if (cancelled) return;
        maplibregl.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs"); // copié par postinstall : le bundler casse le worker intégré
        map = new maplibregl.Map({
          container: el,
          style: theme(style),
          center: [lon, lat],
          zoom: ZOOM,
          interactive: false,
          attributionControl: false,
          fadeDuration: 0,
          canvasContextAttributes: { preserveDrawingBuffer: true },
        });
        // La carte n'est pas interactive : on la fige en image dès qu'elle est dessinée (fiable partout, libère le contexte WebGL).
        map.once("idle", () => {
          if (cancelled || !map) return;
          setImage(map.getCanvas().toDataURL("image/png"));
          map.remove();
          map = undefined;
        });
      } catch {
        // Repli : fond uni avec le pin, le lien reste utilisable.
      }
    };

    const io = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) {
          io.disconnect();
          void start();
        }
      },
      { rootMargin: "300px" },
    );
    io.observe(el);

    return () => {
      cancelled = true;
      io.disconnect();
      map?.remove();
    };
  }, [lat, lon]);

  return (
    <a
      href={mapsUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Ouvrir l'emplacement du studio dans Google Maps"
      className="relative block aspect-[4/3] overflow-hidden rounded-card border border-line bg-[var(--map-land)] transition-colors duration-[var(--dur)] hover:border-line-strong"
    >
      <div ref={box} aria-hidden className="absolute inset-0" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {image && <img src={image} alt="" className="absolute inset-0 size-full object-cover" />}
      <AppleStylePin className="absolute left-1/2 top-1/2 h-[66px] w-[46px] -translate-x-1/2 -translate-y-full overflow-visible" />
      <span aria-hidden className="pointer-events-none absolute inset-0 rounded-card [background:radial-gradient(ellipse_at_center,transparent_60%,var(--map-land)_115%)]" />
      <span className="absolute bottom-2 right-3 text-[10px] text-fg-muted">© OpenFreeMap © OpenStreetMap</span>
    </a>
  );
}
