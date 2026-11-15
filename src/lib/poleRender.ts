/**
 * Rendu 2D réaliste du barber pole de l'intro : solide de révolution éclairé pixel par pixel.
 * - tube de verre : rayures hélicoïdales (compressées vers les bords, comme sur un vrai cylindre),
 *   ombrage diffus, bords assombris, très léger éclat ;
 * - embouts métalliques : profil tourné (boule, collier, gorge, socle) avec bandes d'environnement.
 * Couleurs lues dans les tokens CSS (--pole-*, --fg, --surface-2).
 */

export const POLE_W = 84; // px CSS, taille naturelle
export const POLE_H = 464;
export const POLE_Q = 2; // sur-échantillonnage du canvas

type RGB = [number, number, number];

const hex = (v: string): RGB => {
  const s = v.trim().replace("#", "");
  const n = parseInt(s.length === 3 ? s.replace(/./g, "$&$&") : s, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));

// Profil (y en px naturels) -> rayon et matière.
const TUBE_TOP = 50;
const TUBE_BOT = 418;
const R_TUBE = 30;
const PITCH = 150; // pas de l'hélice (px)

type Part = { r: number; kind: "ball" | "metal" | "groove" | "tube" | "none" };
function profile(y: number): Part {
  if (y < 0 || y >= POLE_H) return { r: 0, kind: "none" };
  if (y < 18) return { r: Math.sqrt(Math.max(0, 81 - (y - 9) ** 2)), kind: "ball" };
  if (y < 22) return { r: 4, kind: "metal" }; // col
  if (y < 27) return { r: 22 + (y - 22) * 3.4, kind: "metal" }; // épaulement
  if (y < 44) return { r: 39, kind: "metal" };
  if (y < 47) return { r: 36, kind: "groove" };
  if (y < TUBE_TOP) return { r: 34, kind: "metal" };
  if (y < TUBE_BOT) return { r: R_TUBE, kind: "tube" };
  if (y < 422) return { r: 34, kind: "metal" };
  if (y < 425) return { r: 36, kind: "groove" };
  if (y < 441) return { r: 39, kind: "metal" };
  if (y < 444) return { r: 37, kind: "groove" };
  if (y < 458) return { r: 42, kind: "metal" };
  return { r: 42 - (y - 458) * 0.45, kind: "metal" }; // arrondi du socle
}

/** Éclairage d'un métal poli : bandes d'environnement le long de l'axe horizontal. */
function chrome(nx: number): number {
  const g = (c: number, w: number) => Math.exp(-(((nx - c) / w) ** 2));
  const rim = 0.45 + 0.55 * Math.sqrt(Math.max(0, 1 - nx * nx));
  return clamp((0.14 + 0.62 * g(-0.38, 0.3) + 0.3 * g(0.58, 0.16) + 0.1 * g(0.05, 0.5)) * rim);
}

/**
 * Construit le pole dans `host` (84 x 464 px). Tout est rendu UNE fois :
 * - une texture de rayures (une période d'hélice), répétée et déplacée en transform (GPU) ;
 * - un calque canvas statique : embouts métalliques opaques + ombrage/éclat du tube en transparence.
 * Aucun calcul par image : l'animation ne coûte que du compositing.
 */
export function createPole(host: HTMLElement) {
  const css = getComputedStyle(document.documentElement);
  const tok = (n: string, d: string) => hex(css.getPropertyValue(n) || d);
  const red = tok("--pole-red", "#d62839");
  const white = tok("--pole-white", "#f5f5f7");
  const blue = tok("--pole-blue", "#1f4e9c");
  const dark = tok("--surface-2", "#1a1a1a");
  const light = tok("--fg", "#f5f5f7");
  const bands = [red, white, blue];
  const Q = POLE_Q;

  // 1) Texture de rayures : x = position sur le tube (compression d'hélice), y = une période.
  const tw = R_TUBE * 2 * Q;
  const th = PITCH * Q;
  const tex = document.createElement("canvas");
  tex.width = tw;
  tex.height = th;
  const tctx = tex.getContext("2d");
  if (!tctx) return;
  const timg = tctx.createImageData(tw, th);
  const smooth = 0.018 * 3;
  for (let py = 0; py < th; py++) {
    const y = (py + 0.5) / Q;
    for (let px = 0; px < tw; px++) {
      const nx = clamp(((px + 0.5) / Q - R_TUBE) / R_TUBE, -1, 1);
      const u = y / PITCH + Math.asin(nx) / (2 * Math.PI);
      const f = u - Math.floor(u);
      const k = Math.floor(f * 3);
      const l = f * 3 - k;
      let c = bands[k]!;
      if (l < smooth) c = mix(bands[(k + 2) % 3]!, c, 0.5 + (0.5 * l) / smooth);
      else if (l > 1 - smooth) c = mix(c, bands[(k + 1) % 3]!, 0.5 * (1 - (1 - l) / smooth));
      const o = (py * tw + px) * 4;
      timg.data[o] = c[0];
      timg.data[o + 1] = c[1];
      timg.data[o + 2] = c[2];
      timg.data[o + 3] = 255;
    }
  }
  tctx.putImageData(timg, 0, 0);

  // 2) Calque statique : embouts + ombrage du tube.
  const W = POLE_W * Q;
  const H = POLE_H * Q;
  const ov = document.createElement("canvas");
  ov.width = W;
  ov.height = H;
  const octx = ov.getContext("2d");
  if (!octx) return;
  const img = octx.createImageData(W, H);
  const d = img.data;

  for (let py = 0; py < H; py++) {
    const y = (py + 0.5) / Q;
    const part = profile(y);
    if (part.kind === "none") continue;
    for (let px = 0; px < W; px++) {
      const x = (px + 0.5) / Q - POLE_W / 2;
      const cov = clamp((part.r - Math.abs(x)) * Q + 0.5);
      if (cov <= 0) continue;
      const nx = clamp(x / part.r, -1, 1);
      const o = (py * W + px) * 4;

      if (part.kind === "tube") {
        const nz = Math.sqrt(Math.max(0, 1 - nx * nx));
        let sh = 0.3 + 0.7 * clamp(0.55 * nz - 0.5 * nx + 0.25);
        const dEnd = Math.min(y - TUBE_TOP, TUBE_BOT - y);
        sh *= 0.72 + 0.28 * clamp(dEnd / 14);
        const sp = 0.16 * Math.exp(-(((nx + 0.5) / 0.07) ** 2)) + 0.07 * Math.exp(-(((nx - 0.82) / 0.06) ** 2));
        // final = c*sh + 255*sp, exprimé comme une couche (K, A) posée sur c.
        const A = clamp(1 - sh + sp);
        const K = A > 0 ? clamp((255 * sp) / A, 0, 255) : 0;
        d[o] = d[o + 1] = d[o + 2] = K;
        d[o + 3] = Math.round(A * 255);
        continue;
      }

      let c: RGB;
      if (part.kind === "ball") {
        const dx = x / 9;
        const dy = (y - 9) / 9;
        const nz = Math.sqrt(Math.max(0, 1 - dx * dx - dy * dy));
        const lam = clamp(-0.5 * dx - 0.55 * dy + 0.65 * nz);
        const sp = Math.pow(clamp(-0.4 * dx - 0.5 * dy + 0.77 * nz), 28);
        c = mix(dark, light, clamp(0.12 + 0.78 * lam + 0.5 * sp));
      } else if (part.kind === "groove") {
        c = mix(dark, light, 0.06 + 0.1 * chrome(nx));
      } else {
        let v = chrome(nx);
        const near = (a: number, w: number) => clamp(1 - Math.abs(y - a) / w);
        v += 0.28 * near(27, 1.2) + 0.2 * near(44, 1.2) + 0.22 * near(441, 1.2) - 0.25 * near(421.5, 1.5);
        c = mix(dark, light, clamp(v));
      }
      d[o] = c[0];
      d[o + 1] = c[1];
      d[o + 2] = c[2];
      d[o + 3] = Math.round(cov * 255);
    }
  }
  octx.putImageData(img, 0, 0);

  // 3) Assemblage DOM : tube (rayures qui montent en transform) sous le calque statique.
  const tube = document.createElement("div");
  tube.className = "pole-tube";
  tube.style.cssText = `left:${POLE_W / 2 - R_TUBE}px;top:${TUBE_TOP}px;width:${R_TUBE * 2}px;height:${TUBE_BOT - TUBE_TOP}px`;
  const stripes = document.createElement("div");
  stripes.className = "pole-stripes";
  stripes.style.cssText = `height:${TUBE_BOT - TUBE_TOP + PITCH}px;background-image:url(${tex.toDataURL()});background-size:${R_TUBE * 2}px ${PITCH}px`;
  tube.appendChild(stripes);
  ov.className = "pole-cover";
  host.replaceChildren(tube, ov);
  // Défilement en WAAPI avec valeurs en px (animation 100 % compositeur, sans variable CSS).
  const scroll = stripes.animate([{ transform: "translate3d(0, 0, 0)" }, { transform: `translate3d(0, ${-PITCH}px, 0)` }], {
    duration: 1600,
    iterations: Infinity,
  });
  return scroll;
}
