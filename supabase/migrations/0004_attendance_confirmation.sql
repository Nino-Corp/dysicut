-- Dysicut : confirmation de presence la veille. A coller dans Supabase > SQL Editor > Run, apres 0003.
-- confirmation_requested_at : le rappel de la veille (avec le bouton "Je confirme") a ete envoye.
-- attendance_confirmed_at   : le client a confirme sa venue.
alter table bookings add column if not exists confirmation_requested_at timestamptz;
alter table bookings add column if not exists attendance_confirmed_at timestamptz;
