"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { Bars2Icon, XMarkIcon } from "@heroicons/react/24/outline";
import { navLinks } from "@/config/nav";
import { site } from "@/config/site";
import { LogoMark } from "@/components/ui/LogoMark";
import { BookButton } from "@/components/ui/BookButton";
import { OpenStatus } from "@/components/widgets/OpenStatus";

export function Nav() {
  const drawer = useRef<HTMLDialogElement>(null);
  const header = useRef<HTMLElement>(null);
  const inner = useRef<HTMLElement>(null);

  const open = () => {
    drawer.current?.showModal();
    document.documentElement.style.overflow = "hidden";
  };
  const close = () => drawer.current?.close();

  useEffect(() => {
    const el = drawer.current;
    const onClose = () => {
      document.documentElement.style.overflow = "";
    };
    // Repasse en desktop avec le tiroir ouvert : on le ferme.
    const mq = window.matchMedia("(min-width: 700px)");
    const onMq = () => mq.matches && el?.open && el.close();
    el?.addEventListener("close", onClose);
    mq.addEventListener("change", onMq);
    return () => {
      el?.removeEventListener("close", onClose);
      mq.removeEventListener("change", onMq);
      document.documentElement.style.overflow = "";
    };
  }, []);

  // Header fixe : suit le scroll (disparait vers le bas, reapparait des qu'on remonte), contenu en leger decalage (parallaxe).
  useEffect(() => {
    const h = header.current;
    const n = inner.current;
    if (!h || !n) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let last = window.scrollY;
    let offset = 0;
    let raf = 0;
    const apply = () => {
      raf = 0;
      const max = h.offsetHeight + 24; // + marge pour l'ombre
      const y = Math.max(0, window.scrollY);
      const delta = y - last;
      last = y;
      offset = y <= 0 ? 0 : Math.min(max, Math.max(0, offset + delta));
      h.style.transform = `translate3d(0, ${-offset}px, 0)`;
      if (!reduce) n.style.transform = `translate3d(0, ${-offset * 0.35}px, 0)`;
      h.toggleAttribute("data-scrolled", y > 8);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(apply);
    };
    apply();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <header ref={header} className="site-header fixed inset-x-0 top-0 z-30 bg-surface will-change-transform">
      <nav ref={inner} aria-label="Navigation principale" className="mx-auto flex h-16 max-w-[1400px] items-center justify-between px-5 nav:h-20 nav:px-14">
        <Link href="/" aria-label={`${site.name}, accueil`} className="nav-logo flex min-h-11 items-center">
          <LogoMark className="h-11 w-auto nav:h-12" />
        </Link>

        <OpenStatus className="nav:hidden" />

        <ul className="hidden items-center gap-8 nav:flex">
          {navLinks.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className="flex min-h-11 items-center text-sm text-fg/80 transition-colors duration-[var(--dur)] hover:text-fg">
                {l.label}
              </Link>
            </li>
          ))}
          <li>
            <BookButton />
          </li>
        </ul>

        <button
          type="button"
          onClick={open}
          aria-label="Ouvrir le menu"
          className="-mr-3 flex size-12 items-center justify-center nav:hidden"
        >
          <Bars2Icon className="size-6" />
        </button>
      </nav>

      <dialog
        ref={drawer}
        aria-label="Menu"
        onClick={(e) => e.target === e.currentTarget && close()}
        className="drawer m-0 h-dvh max-h-none w-screen max-w-none bg-bg p-0 text-fg"
      >
        <div className="flex h-full flex-col px-5 pb-8">
          <div className="flex h-16 items-center justify-between">
            <span className="text-[15px] font-semibold tracking-tight">{site.name}</span>
            <button type="button" onClick={close} aria-label="Fermer le menu" className="-mr-3 flex size-12 items-center justify-center">
              <XMarkIcon className="size-6" />
            </button>
          </div>
          <ul className="mt-6 flex flex-1 flex-col">
            {navLinks.map((l) => (
              <li key={l.href} className="border-b border-line">
                <Link href={l.href} onClick={close} className="flex min-h-[72px] items-center text-[34px] font-semibold tracking-[-0.035em]">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
          <OpenStatus className="mb-5" />
          <BookButton size="lg" className="w-full" />
        </div>
      </dialog>
    </header>
  );
}
