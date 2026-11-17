import Link from "next/link";
import { ArrowRightIcon, ArrowUpRightIcon } from "@heroicons/react/24/outline";

type Variant = "primary" | "ghost";
type Size = "sm" | "md" | "lg";
type Icon = typeof ArrowRightIcon;

type Base = {
  variant?: Variant;
  size?: Size;
  /** Icone affichee au survol (fleche par defaut, fleche diagonale pour un lien externe). */
  icon?: Icon;
  className?: string;
  children: React.ReactNode;
};
type AsLink = Base & Omit<React.ComponentProps<"a">, keyof Base> & { href: string };
type AsButton = Base & Omit<React.ComponentProps<"button">, keyof Base> & { href?: undefined };
export type HoverButtonProps = AsLink | AsButton;

const SIZE: Record<Size, string> = {
  sm: "h-11 px-6 text-[15px]",
  md: "h-12 px-6 text-[15px]",
  lg: "h-14 px-8 text-[17px]",
};

// Comme 21st.dev (interactive-hover-button) : le libelle part vers la droite, un second libelle + fleche arrive par la droite, le point grossit et remplit le bouton.
// primary : blanc, s'inverse en noir. ghost : filet, se remplit de blanc.
const VARIANT: Record<Variant, { box: string; dot: string; over: string }> = {
  primary: { box: "border-fg bg-fg text-bg", dot: "bg-bg", over: "text-fg" },
  ghost: { box: "border-line-strong text-fg", dot: "bg-fg", over: "text-bg" },
};

const BASE =
  "group relative inline-flex shrink-0 cursor-pointer select-none items-center justify-center overflow-hidden rounded-full border font-semibold tracking-tight transition-transform duration-[var(--dur)] ease-out-soft active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none";

const MOVE = "transition-all duration-300 motion-reduce:transition-none";

/** Bouton pill unique du site : lien interne, lien externe ou bouton. Le libelle reste visible sans survol (tactile). */
export function HoverButton(props: HoverButtonProps) {
  const { variant = "primary", size = "md", icon, className = "", children, ...rest } = props;
  const v = VARIANT[variant];
  const cls = `${BASE} ${SIZE[size]} ${v.box} ${className}`;

  const external = rest.href !== undefined && rest.target === "_blank";
  const Icon = icon ?? (external ? ArrowUpRightIcon : ArrowRightIcon);

  // Au repos : point + libelle forment un groupe centre dans le bouton.
  const inner = (
    <>
      <span className="inline-flex items-center gap-2 leading-none">
        <span aria-hidden className={`size-2 shrink-0 rounded-full ${v.dot} ${MOVE} group-hover:scale-[200] group-focus-visible:scale-[200]`} />
        <span className={`inline-flex items-center ${MOVE} group-hover:translate-x-12 group-hover:opacity-0 group-focus-visible:translate-x-12 group-focus-visible:opacity-0`}>
          {children}
        </span>
      </span>
      <span
        aria-hidden
        className={`absolute inset-0 z-10 flex translate-x-12 items-center justify-center gap-2 leading-none opacity-0 ${v.over} ${MOVE} group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100`}
      >
        <span className="inline-flex items-center">{children}</span>
        <Icon className="size-5 shrink-0" aria-hidden />
      </span>
    </>
  );

  if (rest.href !== undefined) {
    const { href, rel, ...a } = rest;
    if (href.startsWith("/") && !href.startsWith("/api/")) {
      return (
        <Link href={href} className={cls} {...a}>
          {inner}
        </Link>
      );
    }
    return (
      <a href={href} rel={external ? "noopener noreferrer" : rel} className={cls} {...a}>
        {inner}
      </a>
    );
  }
  const { href: _unused, ...b } = rest;
  void _unused;
  return (
    <button type="button" className={cls} {...b}>
      {inner}
    </button>
  );
}
