import Link from "next/link";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { LogoMark } from "@/components/ui/LogoMark";

/** Cadre commun des pages de réservation : logo, fermer, colonne centrée (mobile d'abord). */
export function BookingShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex h-16 max-w-[560px] items-center justify-between px-5 nav:h-20">
        <Link href="/" aria-label="Dysicut, retour à l'accueil" className="inline-flex h-11 items-center">
          <LogoMark className="h-9 w-auto" />
        </Link>
        <Link href="/" aria-label="Fermer" className="inline-flex size-11 items-center justify-center rounded-full border border-line-strong hover:bg-surface-2">
          <XMarkIcon className="size-5" aria-hidden />
        </Link>
      </header>
      <main className="mx-auto max-w-[560px] px-5 pb-[max(3rem,env(safe-area-inset-bottom))] pt-4">{children}</main>
    </div>
  );
}
