"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUpRightIcon } from "@heroicons/react/24/outline";
import { navLinks } from "@/config/nav";
import { site } from "@/config/site";
import { LogoMark } from "@/components/ui/LogoMark";
import { BookButton } from "@/components/ui/BookButton";
import { ScrollLink } from "@/components/ui/ScrollLink";
import { OpenStatus } from "@/components/widgets/OpenStatus";

/** Burger « lame » : deux traits (le second plus court) qui se croisent en X, un blanc et un gris comme le logo. */
function Burger({ open }: { open: boolean }) {
  return (
    <span aria-hidden data-open={open} className="burger">
      <span className="burger-bar burger-bar-a" />
      <span className="burger-bar burger-bar-b" />
    </span>
  );
}

export function Nav() {
  const drawer = useRef<HTMLDialogElement>(null);
  const header = useRef<HTMLElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  const show = useCallback(() => {
    const el = drawer.current;
    if (!el || el.open) return;
    el.removeAttribute("data-closing");
    el.showModal();
    // Évite que le logo reçoive le focus (et son cadre blanc) à l'ouverture.
    el.focus({ preventScroll: true });
    document.documentElement.style.overflow = "hidden";
    setOpen(true);
  }, []);

  // Fermeture animee : on bascule data-closing, la fin de l'animation ferme le dialog.
  const close = useCallback(() => {
    const el = drawer.current;
    if (!el || !el.open || el.hasAttribute("data-closing")) return;
    el.setAttribute("data-closing", "");
    document.documentElement.style.overflow = "";
    setOpen(false);
  }, []);

  useEffect(() => {
    const el = drawer.current;
    if (!el) return;
    const onEnd = (e: AnimationEvent) => {
      if (e.target === el && el.hasAttribute("data-closing")) {
        el.close();
        el.removeAttribute("data-closing");
        trigger.current?.focus({ preventScroll: true });
      }
    };
    // Echap : meme fermeture animee que le bouton.
    const onCancel = (e: Event) => {
      e.preventDefault();
      close();
    };
    // Repasse en desktop avec le tiroir ouvert : fermeture immediate.
    const mq = window.matchMedia("(min-width: 700px)");
    const onMq = () => {
      if (mq.matches && el.open) {
        el.removeAttribute("data-closing");
        el.close();
        document.documentElement.style.overflow = "";
        setOpen(false);
      }
    };
    el.addEventListener("animationend", onEnd);
    el.addEventListener("cancel", onCancel);
    mq.addEventListener("change", onMq);
    return () => {
      el.removeEventListener("animationend", onEnd);
      el.removeEventListener("cancel", onCancel);
      mq.removeEventListener("change", onMq);
      document.documentElement.style.overflow = "";
    };
  }, [close]);

  // Header fixe et statique : toujours visible ; seul l'etat "scrolled" (filet/ombre) est bascule.
  useEffect(() => {
    const h = header.current;
    if (!h) return;
    const apply = () => h.toggleAttribute("data-scrolled", window.scrollY > 8);
    apply();
    window.addEventListener("scroll", apply, { passive: true });
    return () => window.removeEventListener("scroll", apply);
  }, []);

  return (
    <header ref={header} className="site-header fixed inset-x-0 top-0 z-30 bg-surface">
      <nav aria-label="Navigation principale" className="mx-auto flex h-16 max-w-[1400px] items-center justify-between px-5 nav:h-20 nav:px-14">
        <ScrollLink href="/#accueil" aria-label={`${site.name}, accueil`} className="nav-logo flex min-h-11 items-center">
          <LogoMark className="h-11 w-auto nav:h-12" />
        </ScrollLink>

        <OpenStatus className="nav:hidden" />

        <ul className="hidden items-center gap-8 nav:flex">
          {navLinks.map((l) => (
            <li key={l.href}>
              <ScrollLink href={l.href} className="cut-link flex min-h-11 items-center text-sm text-fg/80 transition-colors duration-[var(--dur)] hover:text-fg">
                <span className="cut-link-box">
                  <span className="cut-link-a">{l.label}</span>
                  <span aria-hidden className="cut-link-b">{l.label}</span>
                </span>
              </ScrollLink>
            </li>
          ))}
          <li>
            <BookButton />
          </li>
        </ul>

        <button
          ref={trigger}
          type="button"
          onClick={show}
          aria-label="Ouvrir le menu"
          aria-haspopup="dialog"
          aria-expanded={open}
          className="burger-btn -mr-2 flex size-12 items-center justify-center rounded-full nav:hidden"
        >
          <Burger open={false} />
        </button>
      </nav>

      <dialog
        ref={drawer}
        aria-label="Menu"
        tabIndex={-1}
        onClick={(e) => e.target === e.currentTarget && close()}
        className="drawer m-0 h-dvh outline-none max-h-none w-screen max-w-none bg-bg p-0 text-fg"
      >
        <div aria-hidden className="drawer-blade" />
        <div className="relative flex h-full flex-col px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <div className="flex h-16 items-center justify-between">
            <ScrollLink href="/#accueil" onClick={close} aria-label={`${site.name}, accueil`} className="flex min-h-11 items-center">
              <LogoMark className="h-11 w-auto" />
            </ScrollLink>
            <button
              type="button"
              onClick={close}
              aria-label="Fermer le menu"
              className="burger-btn -mr-2 flex size-12 items-center justify-center rounded-full"
            >
              <Burger open />
            </button>
          </div>

          <ul className="mt-4 flex flex-1 flex-col justify-center">
            {navLinks.map((l, i) => (
              <li key={l.href} className="drawer-item" style={{ "--i": i } as React.CSSProperties}>
                <ScrollLink
                  href={l.href}
                  onClick={close}
                  className="drawer-link group flex min-h-[76px] items-baseline gap-4 border-b border-line py-3"
                >
                  <span className="w-6 text-[13px] tabular-nums text-fg-muted">0{i + 1}</span>
                  <span className="text-[42px] font-semibold leading-none tracking-[-0.045em] transition-transform duration-[var(--dur)] ease-[var(--ease)] group-active:translate-x-2">
                    {l.label}
                  </span>
                </ScrollLink>
              </li>
            ))}
          </ul>

          <div className="drawer-item" style={{ "--i": navLinks.length } as React.CSSProperties}>
            <div className="mb-5 flex items-center justify-between gap-4">
              <OpenStatus />
              <a
                href={site.social.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center gap-1.5 text-[13px] text-fg-muted"
              >
                @{site.social.instagramHandle}
                <ArrowUpRightIcon className="size-3.5" aria-hidden />
              </a>
            </div>
            <BookButton size="lg" className="w-full" />
          </div>
        </div>
      </dialog>
    </header>
  );
}
