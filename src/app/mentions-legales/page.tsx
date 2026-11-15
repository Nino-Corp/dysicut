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
  const { street, postalCode, city } = site.address;
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
          <p>Adresse du studio : {street}, {postalCode} {city}</p>
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

        <Block id="donnees-personnelles" title="Données personnelles">
          <p>Responsable du traitement : {todo(legal.ownerName)}, {site.name}.</p>
          <p>
            Lors d&apos;une réservation, nous collectons ton prénom, ton numéro de téléphone et, si tu le souhaites, ton adresse email, ainsi que la prestation et l&apos;horaire choisis. Ces données servent uniquement à gérer ton rendez-vous : le confirmer, te prévenir en cas de changement et t&apos;envoyer un rappel. Base légale : l&apos;exécution de ta demande de rendez-vous.
          </p>
          <p>
            Elles sont conservées 12 mois après le rendez-vous, puis supprimées. Elles ne sont ni vendues ni utilisées pour de la publicité. Elles sont traitées par nos prestataires techniques, uniquement pour faire fonctionner le service : hébergement et base de données, envoi d&apos;emails.
          </p>
          <p>
            Tu peux demander à tout moment l&apos;accès, la correction ou la suppression de tes données, en écrivant à {todo(legal.contactEmail)}. En cas de désaccord, tu peux saisir la CNIL (<a className="underline" href="https://www.cnil.fr">cnil.fr</a>).
          </p>
        </Block>

        <Block title="Cookies et stockage local">
          <p>
            Le site n&apos;utilise ni cookie publicitaire ni outil de mesure d&apos;audience. Ton navigateur conserve uniquement de quoi faire fonctionner le site : le fait d&apos;avoir vu l&apos;animation d&apos;accueil et, si tu réserves, le lien de ton rendez-vous pour pouvoir l&apos;annuler.
          </p>
          <p>
            La carte et les contenus Instagram ne se chargent que si tu le demandes ou depuis les serveurs du site. Si tu affiches la carte, Google Maps peut déposer ses propres cookies.
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
