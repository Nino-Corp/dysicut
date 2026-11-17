# Déploiement (Vercel)

Checklist, dans l'ordre. Rien ici n'est exécuté automatiquement.

## 1. Avant de déployer
- Supabase : coller `supabase/migrations/0001_booking.sql` (et les suivantes) dans le SQL Editor. Créer le compte admin (Authentication > Users, Auto Confirm) et désactiver les inscriptions.
- Resend : vérifier le nom de domaine (enregistrements DNS), sinon l'envoi n'est possible que vers l'email du compte.
- Renseigner `legal` dans `src/config/site.ts` (nom, SIRET, email réel, médiateur) : la page mentions légales affiche « à compléter » sinon.
- Adresse : quand elle est confirmée, corriger `site.address` et passer `confirmed: true` (active l'adresse dans le JSON-LD, la page mentions légales et les emails).

## 2. Projet Vercel
1. Importer le dépôt Git dans Vercel (framework Next.js détecté).
2. Variables d'environnement (Production) : `NEXT_PUBLIC_SITE_URL` (https://ton-domaine.fr, sans slash final), `NOTIFY_EMAIL` (email réel de l'ami), `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `RESEND_FROM`, `ADMIN_EMAIL`, `CRON_SECRET` (`openssl rand -base64 32`).
3. Déployer.

## 3. Domaine
- Settings > Domains : ajouter le domaine, puis créer les enregistrements DNS indiqués (A / CNAME). Choisir la version canonique (avec ou sans `www`) et rediriger l'autre.
- Redéployer si `NEXT_PUBLIC_SITE_URL` a été changée après coup (valeur figée au build).

## 4. Cron
`vercel.json` déclare `/api/cron/reminders` chaque jour à 16h UTC (17h ou 18h à Paris). Vercel envoie `Authorization: Bearer $CRON_SECRET`. Vérifier dans Settings > Cron Jobs qu'il est listé ; le plan gratuit autorise un cron quotidien.

## 5. Après la mise en ligne
- Ouvrir `/sitemap.xml`, `/robots.txt`, `/opengraph-image`.
- Tester le partage du lien (Instagram, WhatsApp) et le test des résultats enrichis Google sur la page d'accueil.
- Créer la fiche Google Business Profile et soumettre le sitemap dans Google Search Console.
- Faire une réservation de test, puis l'annuler.
