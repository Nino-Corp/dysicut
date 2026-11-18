// Defilement vers une section : courbe douce, sans toucher a l'URL, avec un trait de lame diagonal
// (meme geste que le filet du hero). Reduced-motion : saut direct.

const ease = (t: number) => (t < 0.5 ? 8 * t ** 4 : 1 - (-2 * t + 2) ** 4 / 2);

let cancel: (() => void) | null = null;

function blade(dir: 1 | -1, ms: number) {
  const el = document.createElement("div");
  el.setAttribute("aria-hidden", "true");
  const line = "color-mix(in srgb, var(--fg) 45%, transparent)";
  Object.assign(el.style, {
    position: "fixed",
    inset: "0",
    zIndex: "40",
    pointerEvents: "none",
    background: `linear-gradient(to top right, transparent calc(50% - 0.5px), ${line} 50%, transparent calc(50% + 0.5px))`,
  });
  document.body.appendChild(el);
  const from = dir === 1 ? "translate3d(-35%, 35%, 0)" : "translate3d(35%, -35%, 0)";
  const to = dir === 1 ? "translate3d(35%, -35%, 0)" : "translate3d(-35%, 35%, 0)";
  const a = el.animate(
    [
      { transform: from, opacity: 0 },
      { opacity: 1, offset: 0.35 },
      { transform: to, opacity: 0 },
    ],
    { duration: ms + 200, easing: "cubic-bezier(.22,1,.36,1)" },
  );
  a.onfinish = a.oncancel = () => el.remove();
}

function arrive(target: HTMLElement) {
  target.setAttribute("tabindex", "-1");
  target.focus({ preventScroll: true });
  target.style.outline = "none";
}

export function scrollToId(id: string): boolean {
  const target = document.getElementById(id);
  if (!target) return false;
  cancel?.();

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const start = window.scrollY;
  const max = document.documentElement.scrollHeight - window.innerHeight;
  const end = Math.max(0, Math.min(max, target.getBoundingClientRect().top + start));
  const dist = end - start;

  if (reduce || Math.abs(dist) < 2) {
    window.scrollTo(0, end);
    arrive(target);
    return true;
  }

  const ms = Math.min(1300, Math.max(750, 500 + Math.abs(dist) * 0.18));
  blade(dist > 0 ? 1 : -1, ms);

  let raf = 0;
  const t0 = performance.now();
  const stop = () => {
    cancelAnimationFrame(raf);
    for (const ev of ["wheel", "touchstart", "keydown", "mousedown"]) window.removeEventListener(ev, stop);
    cancel = null;
  };
  const step = (now: number) => {
    const p = Math.min(1, (now - t0) / ms);
    window.scrollTo(0, start + dist * ease(p));
    if (p < 1) raf = requestAnimationFrame(step);
    else {
      stop();
      arrive(target);
    }
  };
  for (const ev of ["wheel", "touchstart", "keydown", "mousedown"]) window.addEventListener(ev, stop, { passive: true, once: true });
  cancel = stop;
  raf = requestAnimationFrame(step);
  return true;
}
