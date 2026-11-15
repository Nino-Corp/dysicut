import Link from "next/link";
import { bookingHref } from "@/config/nav";

type Props = { size?: "md" | "lg"; className?: string; children?: React.ReactNode };

/** CTA principal : pill blanc sur noir. */
export function BookButton({ size = "md", className = "", children = "Prendre rdv" }: Props) {
  const sizing = size === "lg" ? "h-14 px-8 text-[17px]" : "h-11 px-6 text-[15px]";
  return (
    <Link
      href={bookingHref}
      className={`inline-flex items-center justify-center rounded-full bg-fg font-semibold tracking-tight text-bg transition-[transform,opacity] duration-[var(--dur)] ease-out-soft hover:opacity-90 active:scale-[0.98] ${sizing} ${className}`}
    >
      {children}
    </Link>
  );
}
