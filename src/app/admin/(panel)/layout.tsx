import Link from "next/link";
import { ArrowRightStartOnRectangleIcon } from "@heroicons/react/24/outline";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { LogoMark } from "@/components/ui/LogoMark";
import { logout } from "@/lib/admin/actions";
import { requireAdmin } from "@/lib/admin/session";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex h-16 max-w-[720px] items-center justify-between px-5">
        <Link href="/admin" aria-label="Agenda" className="inline-flex h-11 items-center">
          <LogoMark className="h-9 w-auto" />
        </Link>
        <form action={logout}>
          <button type="submit" aria-label="Se déconnecter" className="inline-flex size-11 items-center justify-center rounded-full border border-line-strong hover:bg-surface-2">
            <ArrowRightStartOnRectangleIcon className="size-5" aria-hidden />
          </button>
        </form>
      </header>
      <main className="mx-auto max-w-[720px] px-5 pb-32 pt-2">{children}</main>
      <AdminTabs />
    </div>
  );
}
