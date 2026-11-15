-- Dysicut : dashboard admin (etape 8). A coller dans Supabase > SQL Editor > Run, apres 0001.
-- Jeton secret du flux iCal prive (genere et regenere par l'app depuis /admin/reglages).
alter table booking_settings add column if not exists ical_token text;
