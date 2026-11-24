"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpOnSquareIcon, EllipsisVerticalIcon, PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";

type Platform = "ios" | "android" | null;
type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

const KEY = "dysicut-install-dismissed";
const DELAY_MS = 7000;

function detect(): Platform {
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (ios) {
    // Sur iPhone, seul Safari peut ajouter à l'écran d'accueil (pas Chrome/Firefox/Instagram).
    return /CriOS|FxiOS|EdgiOS|OPiOS|Instagram|FBAN|FBAV|TikTok/.test(ua) ? null : "ios";
  }
  return /Android/.test(ua) ? "android" : null;
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-line-strong text-[13px] font-semibold">{n}</span>
      <span className="text-[15px] leading-snug text-fg">{children}</span>
    </li>
  );
}

/** Bulle d'aide : explique pas à pas comment ajouter le site à l'écran d'accueil. Mobile uniquement, une seule fois. */
export function InstallPrompt() {
  const [platform, setPlatform] = useState<Platform>(null);
  const [open, setOpen] = useState(false);
  const deferred = useRef<InstallEvent | null>(null);

  useEffect(() => {
    try {
      if (localStorage.getItem(KEY)) return;
    } catch {}
    const standalone = matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
    if (standalone) return;
    const p = detect();
    if (!p) return;
    setPlatform(p);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      deferred.current = e as InstallEvent;
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    const onInstalled = () => setOpen(false);
    window.addEventListener("appinstalled", onInstalled);
    const t = setTimeout(() => setOpen(true), DELAY_MS);
    return () => {
      clearTimeout(t);
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  function dismiss() {
    setOpen(false);
    try {
      localStorage.setItem(KEY, "1");
    } catch {}
  }

  async function install() {
    const ev = deferred.current;
    if (!ev) return;
    await ev.prompt();
    await ev.userChoice;
    dismiss();
  }

  if (!platform || !open) return null;

  return (
    <section
      role="dialog"
      aria-label="Ajouter Dysicut à l'écran d'accueil"
      className="install-prompt fixed inset-x-4 z-30 rounded-[20px] border border-line-strong bg-surface-2 p-5 nav:hidden"
      style={{ bottom: "calc(env(safe-area-inset-bottom) + 6rem)" }}
    >
      <button type="button" onClick={dismiss} aria-label="Fermer" className="absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-full text-fg-muted">
        <XMarkIcon className="h-5 w-5" />
      </button>
      <p className="pr-10 text-[17px] font-semibold tracking-[-0.01em]">Garde Dysicut sur ton téléphone</p>
      <p className="mt-1 text-[15px] text-fg-muted">Une icône sur ton écran d'accueil, comme une vraie app. Pour réserver en un tap.</p>

      {platform === "ios" ? (
        <ol className="mt-4 space-y-3">
          <Step n={1}>
            Appuie sur <ArrowUpOnSquareIcon className="mx-0.5 inline h-5 w-5 align-[-4px]" aria-label="le bouton Partager" /> en bas de l'écran
          </Step>
          <Step n={2}>
            Choisis <strong className="font-semibold">« Sur l'écran d'accueil »</strong> <PlusIcon className="inline h-4 w-4 align-[-3px]" aria-hidden />
          </Step>
          <Step n={3}>
            Appuie sur <strong className="font-semibold">« Ajouter »</strong>
          </Step>
        </ol>
      ) : deferred.current ? (
        <button type="button" onClick={install} className="mt-4 flex h-12 w-full items-center justify-center rounded-full bg-fg text-[16px] font-semibold text-bg">
          Ajouter à l'écran d'accueil
        </button>
      ) : (
        <ol className="mt-4 space-y-3">
          <Step n={1}>
            Appuie sur <EllipsisVerticalIcon className="mx-0.5 inline h-5 w-5 align-[-4px]" aria-label="le menu" /> en haut à droite
          </Step>
          <Step n={2}>
            Choisis <strong className="font-semibold">« Ajouter à l'écran d'accueil »</strong>
          </Step>
        </ol>
      )}

      <button type="button" onClick={dismiss} className="mt-3 h-11 w-full text-[14px] text-fg-muted">
        Plus tard
      </button>
    </section>
  );
}
