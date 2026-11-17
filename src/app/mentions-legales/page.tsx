import type { Metadata } from "next";
import Link from "next/link";
import { legal, site } from "@/config/site";

export const metadata: Metadata = {
  title: "Mentions légales",
  robots: { index: false },
};

const todo = (v: string | null) => v ?? "à compléter";

function Block({ title, id, children }: { title: string; id?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mt-12 scroll-mt-6">
      <h2 className="text-2xl font-semibold tracking-[-0.03em]">{title}</h2>
      <div className="mt-4 space-y-3 text-[17px] leading-relaxed text-fg/85">{children}</div>
    </section>
  );
}

export default function MentionsLegales() {
  const address = site.address;
  const { street, postalCode, city } = address;
  return (
    <main className="px-5 py-12 nav:px-14 nav:py-20">
      <article className="mx-auto max-w-2xl">
        <Link href="/" className="flex min-h-11 items-center text-[15px] text-fg-muted hover:text-fg">Retour à l&apos;accueil</Link>
        <h1 className="mt-6 text-[clamp(2.25rem,6vw,3.5rem)] font-bold tracking-[-0.04em]">Mentions légales et confidentialité</h1>

        <Block title="Éditeur du site">
          <p>
            {site.name}, {legal.statut.toLowerCase()}, exploité par {todo(legal.ownerName)}.
          </p>
          <p>SIRET : {todo(legal.siret)}</p>
          <p>Adresse du studio : {address.confirmed ? `${street}, ${postalCode} ${city}` : "à compléter"}</p>
          <p>Contact : {todo(legal.contactEmail)} ou message privé Instagram @{site.social.instagramHandle}</p>
          <p>Directeur de la publication : {todo(legal.ownerName)}.</p>
        </Block>

        <Block title="Hébergement">
          <p>
            Le site est hébergé par {legal.host.name}, {legal.host.address}. <a className="underline" href={legal.host.url}>{legal.host.url}</a>
          </p>
        </Block>

        <Block title="Propriété intellectuelle">
          <p>
            Le nom, le logo, les photos et les textes du site sont la propriété de {site.name}. Toute reproduction sans autorisation écrite est interdite.
          </p>
        </Block>

        <Block id="donnees-personnelles" title="Données personnelles et cookies">
          <p>
            Les données collectées lors d&apos;une réservation, leur durée de conservation, tes droits (accès, correction, suppression) et l&apos;usage du stockage local sont détaillés dans la{" "}
            <Link className="underline underline-offset-4" href="/confidentialite">politique de confidentialité</Link>.
          </p>
        </Block>

        <Block title="Annulation et responsabilité">
          <p>
            Un rendez-vous peut être annulé via le lien reçu à la réservation. Passé le délai indiqué sur le site, contacte directement {site.name}. Nous nous efforçons de garder le site accessible et à jour, sans garantie de disponibilité permanente.
          </p>
        </Block>

        <Block title="Médiation de la consommation">
          <p>
            Conformément au Code de la consommation, tu peux recourir gratuitement à un médiateur en cas de litige non résolu : {todo(legal.mediator)}.
          </p>
        </Block>

        <p className="mt-12 text-sm text-fg-muted">Dernière mise à jour : novembre 2026.</p>
      </article>
    </main>
  );
}
