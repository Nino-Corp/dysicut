import Link from "next/link";
import { navLinks, bookingHref } from "@/config/nav";
import { site } from "@/config/site";
import { LogoMark } from "@/components/ui/LogoMark";

const link = "flex min-h-11 items-center text-[15px] text-fg-muted transition-colors duration-[var(--dur)] hover:text-fg";

export function Footer() {
  return (
    <footer id="contact" className="scroll-mt-4 border-t border-line px-5 pb-32 pt-16 nav:px-14 nav:pb-12">
      <div className="mx-auto grid max-w-[1400px] gap-12 nav:grid-cols-[1.5fr_1fr_1fr]">
        <div>
          <LogoMark className="h-14 w-auto" />
          <p className="mt-5 text-[15px] text-fg-muted">
            {site.name} · {site.city} · {site.address.district}
            <br />
            Sur rendez-vous
          </p>
        </div>

        <nav aria-label="Pied de page">
          <ul>
            <li><Link href={bookingHref} className={`${link} !text-fg font-semibold`}>Prendre RDV</Link></li>
            {navLinks.filter((l) => l.label !== "Contact").map((l) => (
              <li key={l.href}><Link href={l.href} className={link}>{l.label}</Link></li>
            ))}
          </ul>
        </nav>

        <ul>
          <li>
            <a href={site.social.instagramUrl} target="_blank" rel="noopener noreferrer" className={link}>
              Instagram · @{site.social.instagramHandle}
            </a>
          </li>
          <li><a href={site.social.instagramDm} target="_blank" rel="noopener noreferrer" className={link}>Écrire en message privé</a></li>
          <li><Link href="/mentions-legales" className={link}>Mentions légales</Link></li>
          <li><Link href="/confidentialite" className={link}>Confidentialité</Link></li>
        </ul>
      </div>
      <p className="mx-auto mt-12 max-w-[1400px] text-sm text-fg-muted">© {new Date().getFullYear()} {site.name}</p>
    </footer>
  );
}
