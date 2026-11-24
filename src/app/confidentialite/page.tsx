import type { Metadata } from "next";
import Link from "next/link";
import { legal, site } from "@/config/site";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description: `Quelles données ${site.name} collecte quand tu prends rendez-vous, pourquoi, combien de temps, et comment les faire effacer.`,
  alternates: { canonical: "/confidentialite" },
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

const ul = "list-disc space-y-2 pl-5 marker:text-fg-muted";

export default function Confidentialite() {
  const contact = todo(legal.contactEmail);
  return (
    <main className="px-5 py-12 nav:px-14 nav:py-20">
      <article className="mx-auto max-w-2xl">
        <Link href="/" className="flex min-h-11 items-center text-[15px] text-fg-muted hover:text-fg">Retour à l&apos;accueil</Link>
        <h1 className="mt-6 text-[clamp(2.25rem,6vw,3.5rem)] font-bold tracking-[-0.04em]">Politique de confidentialité</h1>
        <p className="mt-5 text-[19px] leading-relaxed text-fg/85">
          En clair : on ne garde que ce qu&apos;il faut pour tenir ton rendez-vous, on ne le revend à personne, et tu peux tout faire effacer sur simple demande.
        </p>

        <Block title="Qui est responsable de tes données">
          <p>
            {site.name}, {legal.statut.toLowerCase()}, représenté par {todo(legal.ownerName)}. Contact pour toute question sur tes données : {contact}, ou en message privé Instagram @{site.social.instagramHandle}.
          </p>
          <p>
            Les informations légales de l&apos;éditeur sont dans les <Link className="underline underline-offset-4" href="/mentions-legales">mentions légales</Link>.
          </p>
        </Block>

        <Block id="donnees" title="Ce qu'on collecte, et pourquoi">
          <p>Lors d&apos;une réservation sur <Link className="underline underline-offset-4" href="/reserver">/reserver</Link> :</p>
          <ul className={ul}>
            <li><strong className="font-semibold text-fg">Ton prénom et ton numéro de téléphone</strong> (obligatoires) : pour identifier ton rendez-vous, et pour que {site.name} puisse te joindre s&apos;il doit le décaler ou l&apos;annuler. Le numéro est enregistré au format international.</li>
            <li><strong className="font-semibold text-fg">Ton email</strong> (facultatif) : uniquement si tu veux recevoir la confirmation, le rappel de la veille et un éventuel message d&apos;annulation. Sans email, tu peux réserver et annuler normalement via ton lien.</li>
            <li><strong className="font-semibold text-fg">La prestation, le jour et l&apos;heure</strong> choisis, et le prix correspondant.</li>
            <li><strong className="font-semibold text-fg">Un identifiant d&apos;annulation</strong> (jeton) généré pour ton rendez-vous : il permet à toi seul de l&apos;annuler, sans compte.</li>
            <li><strong className="font-semibold text-fg">Une empreinte anonymisée de ton adresse IP</strong> : ton IP n&apos;est jamais enregistrée telle quelle, seulement transformée en code irréversible, pour limiter les réservations abusives (par exemple un robot qui bloquerait tous les créneaux).</li>
          </ul>
          <p>
            <strong className="font-semibold text-fg">Absences.</strong> Si tu réserves puis ne viens pas sans prévenir, ton rendez-vous est noté « absent » et rattaché à ton numéro. Après plusieurs absences, la réservation en ligne peut être bloquée pour ce numéro, ou un acompte peut t&apos;être demandé. Le studio peut lever ce blocage à tout moment.
          </p>
          <p>
            <strong className="font-semibold text-fg">Acompte.</strong> Quand un acompte est demandé, tu le règles sur la page sécurisée de Stripe : {site.name} ne voit ni ne conserve ton numéro de carte, seulement le fait que le paiement a été reçu, remboursé ou conservé après une absence.
          </p>
          <p>
            Rien d&apos;autre : pas de date de naissance, pas de compte client, pas de profilage.
          </p>
        </Block>

        <Block title="Sur quelle base légale">
          <p>
            Ton <strong className="font-semibold text-fg">consentement</strong>, que tu donnes en cochant la case avant de confirmer ta réservation, et l&apos;exécution de ta demande de rendez-vous. Le traitement de l&apos;empreinte d&apos;IP repose sur l&apos;intérêt légitime de protéger le service contre les abus.
          </p>
          <p>
            Si tu ne coches pas la case, la réservation en ligne n&apos;est pas possible. Tu peux toujours prendre rendez-vous en message privé Instagram.
          </p>
        </Block>

        <Block title="Qui y a accès">
          <p>Seul {site.name} consulte les rendez-vous, depuis un espace d&apos;administration protégé. Tes données ne sont ni vendues, ni louées, ni utilisées pour de la publicité ou de la prospection.</p>
          <p>Pour faire fonctionner le service, elles transitent par des prestataires techniques qui n&apos;agissent que sur instruction :</p>
          <ul className={ul}>
            <li><strong className="font-semibold text-fg">Supabase</strong> : base de données où sont stockés les rendez-vous.</li>
            <li><strong className="font-semibold text-fg">Vercel</strong> : hébergement du site et exécution des tâches automatiques (rappels, nettoyage).</li>
            <li><strong className="font-semibold text-fg">Stripe</strong> : encaissement et remboursement de l&apos;acompte, uniquement lorsqu&apos;un acompte est demandé.</li>
            <li><strong className="font-semibold text-fg">Resend</strong> : envoi des emails de confirmation, de rappel et d&apos;annulation, uniquement si tu as renseigné ton email, et des notifications adressées à {site.name}.</li>
          </ul>
          <p>
            Certains de ces prestataires peuvent traiter des données hors de l&apos;Union européenne, notamment aux États-Unis. Dans ce cas, le transfert est encadré par les clauses contractuelles types de la Commission européenne ou par le cadre de protection des données UE-États-Unis.
          </p>
        </Block>

        <Block id="conservation" title="Combien de temps on les garde">
          <ul className={ul}>
            <li><strong className="font-semibold text-fg">Rendez-vous (prénom, téléphone, email, prestation, horaire)</strong> : 12 mois après la date du rendez-vous, puis suppression automatique.</li>
            <li><strong className="font-semibold text-fg">Empreinte d&apos;IP</strong> : supprimée avec le rendez-vous auquel elle est liée ; elle ne sert à limiter les abus que sur une heure.</li>
            <li><strong className="font-semibold text-fg">Rendez-vous annulé</strong> : même durée, sauf si tu demandes un effacement plus rapide.</li>
          </ul>
          <p>Tu peux demander la suppression avant ce délai, à tout moment (voir plus bas).</p>
        </Block>

        <Block id="tes-droits" title="Tes droits et comment les exercer">
          <p>Tu peux à tout moment :</p>
          <ul className={ul}>
            <li>savoir quelles données on a sur toi et en recevoir une copie ;</li>
            <li>les faire corriger ;</li>
            <li>les faire <strong className="font-semibold text-fg">effacer</strong> ;</li>
            <li>t&apos;opposer à leur traitement ou en demander la limitation ;</li>
            <li>retirer ton consentement, sans effet sur ce qui a eu lieu avant.</li>
          </ul>
          <p>
            Écris à {contact} (ou en message privé Instagram @{site.social.instagramHandle}) en indiquant ton prénom et le numéro utilisé pour la réservation. Pour éviter qu&apos;un tiers demande l&apos;effacement ou la copie de tes données à ta place, on peut te demander de confirmer ton identité depuis ce numéro. Réponse sous un mois au plus.
          </p>
          <p>
            Pour annuler simplement un rendez-vous, le lien reçu à la réservation suffit : l&apos;annulation libère le créneau, mais tes données restent conservées jusqu&apos;à la fin du délai ci-dessus, sauf demande d&apos;effacement.
          </p>
          <p>
            Si tu estimes que tes droits ne sont pas respectés, tu peux introduire une réclamation auprès de la CNIL : <a className="underline underline-offset-4" href="https://www.cnil.fr/fr/plaintes" rel="noopener noreferrer">cnil.fr/fr/plaintes</a>.
          </p>
        </Block>

        <Block id="cookies" title="Cookies et stockage dans ton navigateur">
          <p>
            Le site n&apos;utilise <strong className="font-semibold text-fg">aucun cookie publicitaire et aucun outil de mesure d&apos;audience</strong>. C&apos;est pourquoi il n&apos;y a pas de bandeau de cookies : rien de ce qui est stocké ne sert à te suivre.
          </p>
          <p>Seuls quelques éléments strictement nécessaires au fonctionnement sont conservés sur ton appareil :</p>
          <ul className={ul}>
            <li><strong className="font-semibold text-fg">Ton rendez-vous</strong> (stockage local) : si tu réserves, le lien de ton rendez-vous est mémorisé pour que tu puisses l&apos;afficher, l&apos;annuler ou l&apos;ajouter à ton calendrier. Il reste jusqu&apos;à ce que tu l&apos;annules, que le rendez-vous passe, ou que tu vides les données du site.</li>
            <li><strong className="font-semibold text-fg">L&apos;animation d&apos;accueil</strong> (stockage de session) : un simple repère pour ne pas la rejouer pendant ta visite. Il disparaît quand tu fermes l&apos;onglet.</li>
            <li><strong className="font-semibold text-fg">Connexion à l&apos;espace d&apos;administration</strong> (cookie) : uniquement pour {site.name}, jamais déposé aux visiteurs.</li>
          </ul>
        </Block>

        <Block title="Contenus et services tiers">
          <ul className={ul}>
            <li><strong className="font-semibold text-fg">Carte</strong> : le fond de carte est fourni par OpenFreeMap (données OpenStreetMap). Il se charge quand tu fais défiler la page jusqu&apos;à la section Infos ; ton navigateur contacte alors leurs serveurs, qui voient ton adresse IP comme pour n&apos;importe quel site. Le bouton d&apos;itinéraire ouvre Google Maps, soumis à sa propre politique, seulement si tu cliques.</li>
            <li><strong className="font-semibold text-fg">Publications Instagram</strong> : les photos et vidéos sont relayées par les serveurs du site, sans que ton navigateur contacte Instagram pendant que tu les regardes. Si tu cliques vers Instagram, tu quittes le site et sa politique s&apos;applique.</li>
            <li><strong className="font-semibold text-fg">Polices de caractères</strong> : servies depuis le site lui-même, sans appel à un service externe.</li>
          </ul>
        </Block>

        <Block title="Sécurité">
          <p>
            La base de données n&apos;est accessible que depuis les serveurs du site, avec une clé secrète. Les échanges sont chiffrés (HTTPS), l&apos;espace d&apos;administration est protégé par un mot de passe et limité en tentatives, et ton lien d&apos;annulation est un code aléatoire impossible à deviner. Personne ne peut annuler ton rendez-vous à partir de ton seul numéro de téléphone.
          </p>
        </Block>

        <Block title="Mineurs">
          <p>
            Pour la prestation « Enfant », c&apos;est le parent ou le représentant légal qui réserve et donne son accord, avec son propre prénom et son propre numéro. Aucune donnée n&apos;est demandée sur l&apos;enfant.
          </p>
        </Block>

        <Block title="Modifications">
          <p>
            Si cette politique change de manière significative, la date ci-dessous est mise à jour. Pour la version la plus récente, reviens toujours sur cette page.
          </p>
        </Block>

        <p className="mt-12 text-sm text-fg-muted">Dernière mise à jour : novembre 2026.</p>
      </article>
    </main>
  );
}
