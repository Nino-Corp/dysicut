# Déploiement (Vercel)

Checklist, dans l'ordre. Rien ici n'est exécuté automatiquement.

## 1. Avant de déployer
- Supabase : coller `supabase/migrations/0001_booking.sql` (et les suivantes, dont `0003_noshow_deposit.sql` pour les absences et l'acompte, et `0004_attendance_confirmation.sql` pour la confirmation la veille) dans le SQL Editor. Créer le compte admin (Authentication > Users, Auto Confirm) et désactiver les inscriptions.
- Resend : vérifier le nom de domaine (enregistrements DNS), sinon l'envoi n'est possible que vers l'email du compte.
- Renseigner `legal` dans `src/config/site.ts` (nom, SIRET, email réel, médiateur) : la page mentions légales affiche « à compléter » sinon.
- Adresse : quand elle est confirmée, corriger `site.address` et passer `confirmed: true` (active l'adresse dans le JSON-LD, la page mentions légales et les emails).

## 2. Projet Vercel
1. Importer le dépôt Git dans Vercel (framework Next.js détecté).
2. Variables d'environnement (Production) : `NEXT_PUBLIC_SITE_URL` (https://ton-domaine.fr, sans slash final), `NOTIFY_EMAIL` (email réel de l'ami), `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `RESEND_FROM`, `ADMIN_EMAIL`, `CRON_SECRET` (`openssl rand -base64 32`), et pour l'acompte `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` (voir section Stripe).
3. Déployer.

## 2 bis. Stripe (acompte, optionnel)
Sans les deux clés Stripe, l'acompte reste désactivé et tout le reste fonctionne (absences et blocage inclus).
1. Créer le compte Stripe de l'ami (identité, IBAN pour les virements). Activer la carte, Apple Pay et Google Pay (Settings > Payment methods).
2. Developers > API keys : copier la clé secrète dans `STRIPE_SECRET_KEY` (`sk_test_...` pour tester, `sk_live_...` en production).
3. Developers > Webhooks > Add endpoint : `https://ton-domaine.fr/api/stripe/webhook`, événements `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.expired`. Copier le Signing secret dans `STRIPE_WEBHOOK_SECRET`, puis redéployer.
4. Tester en mode test (carte 4242 4242 4242 4242), puis passer aux clés live (clé ET secret du webhook live, qui sont différents).
5. Dans `/admin/reglages` > Absences et acompte : choisir le mode (aucun, clients déjà absents, tous) et le montant. Frais Stripe : environ 1,5 % + 0,25 € par paiement européen, prélevés par Stripe.
Un acompte est rendu automatiquement si le client annule dans les délais ou si le barber annule ; il est conservé en cas d'absence (remboursable à la main depuis la fiche du rdv).

## 3. Domaine
- Settings > Domains : ajouter le domaine, puis créer les enregistrements DNS indiqués (A / CNAME). Choisir la version canonique (avec ou sans `www`) et rediriger l'autre.
- Redéployer si `NEXT_PUBLIC_SITE_URL` a été changée après coup (valeur figée au build).

## 4. Cron
`vercel.json` déclare `/api/cron/reminders` chaque jour à 16h UTC (17h ou 18h à Paris). Vercel envoie `Authorization: Bearer $CRON_SECRET`. Un second cron, `/api/cron/confirmations` (6h30 UTC, soit 7h30 ou 8h30 à Paris), libère les rdv du jour dont le client n'a pas confirmé sa venue après le rappel de la veille (jamais les rdv ajoutés à la main, avec acompte payé, ou sans email). Vérifier dans Settings > Cron Jobs que les deux sont listés ; le plan gratuit (Hobby) autorise 2 crons, chacun une fois par jour.

## 5. Après la mise en ligne
- Ouvrir `/sitemap.xml`, `/robots.txt`, `/opengraph-image`.
- Tester le partage du lien (Instagram, WhatsApp) et le test des résultats enrichis Google sur la page d'accueil.
- Créer la fiche Google Business Profile et soumettre le sitemap dans Google Search Console.
- Faire une réservation de test, puis l'annuler.
