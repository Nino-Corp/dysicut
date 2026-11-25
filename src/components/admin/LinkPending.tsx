"use client";

import { useLinkStatus } from "next/link";

/** A placer dans un <Link> de l'admin : marque le lien tant que la page suivante charge (style dans globals.css). */
export function LinkPending() {
  const { pending } = useLinkStatus();
  return pending ? <span data-pending hidden /> : null;
}
