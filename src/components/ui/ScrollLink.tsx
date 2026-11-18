"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { scrollToId } from "@/lib/smoothScroll";

type Props = Omit<React.ComponentProps<typeof Link>, "href"> & { href: string };

/** Lien d'ancre de l'accueil : defile en douceur vers la section sans changer l'URL. Hors accueil : navigation normale. */
export function ScrollLink({ href, onClick, children, ...rest }: Props) {
  const pathname = usePathname();
  const id = href.split("#")[1];
  return (
    <Link
      href={href}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented || !id || pathname !== "/") return;
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        if (scrollToId(id)) e.preventDefault();
      }}
      {...rest}
    >
      {children}
    </Link>
  );
}
