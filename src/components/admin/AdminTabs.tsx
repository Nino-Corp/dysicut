"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDaysIcon, Cog6ToothIcon, NoSymbolIcon, PlusIcon } from "@heroicons/react/24/outline";

const tabs = [
  { href: "/admin", label: "Agenda", Icon: CalendarDaysIcon },
  { href: "/admin/nouveau", label: "Nouveau", Icon: PlusIcon },
  { href: "/admin/conges", label: "Congés", Icon: NoSymbolIcon },
  { href: "/admin/reglages", label: "Réglages", Icon: Cog6ToothIcon },
];

/** Barre d'onglets en bas (zone du pouce), identique sur tous les ecrans. */
export function AdminTabs() {
  const path = usePathname();
  return (
    <nav aria-label="Admin" className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm">
      <ul className="mx-auto grid max-w-[720px] grid-cols-4">
        {tabs.map(({ href, label, Icon }) => {
          const active = href === "/admin" ? path === "/admin" || path.startsWith("/admin/rdv") : path.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex h-16 flex-col items-center justify-center gap-1 text-[12px] font-medium ${active ? "text-fg" : "text-fg-muted"}`}
              >
                <Icon className="size-6" aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
