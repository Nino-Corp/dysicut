-- Dysicut : reservation en ligne (etape 7).
-- A coller dans Supabase > SQL Editor > Run (une seule fois). Idempotent autant que possible.
-- Acces : uniquement via le serveur Next.js avec la cle secrete (service role). RLS active
-- et AUCUNE policy : la cle publique (anon) ne peut rien lire ni ecrire.

create extension if not exists btree_gist;

-- ---------------------------------------------------------------- reglages
create table if not exists booking_settings (
  id               smallint primary key default 1 check (id = 1), -- une seule ligne
  booking_enabled  boolean  not null default true,
  slot_step_min    smallint not null default 40 check (slot_step_min between 5 and 240),
  min_lead_hours   smallint not null default 2  check (min_lead_hours >= 0),
  max_advance_days smallint not null default 30 check (max_advance_days between 1 and 365),
  cancel_min_hours smallint not null default 2  check (cancel_min_hours >= 0) -- delai minimum d'annulation cote client (a valider)
);
insert into booking_settings (id) values (1) on conflict (id) do nothing;

-- ---------------------------------------------------------------- prestations
create table if not exists services (
  id           text primary key,
  name         text     not null,
  duration_min smallint not null check (duration_min between 5 and 480),
  price_cents  integer  not null check (price_cents >= 0),
  active       boolean  not null default true,
  sort         smallint not null default 0
);
-- TODO tarifs reels : valeurs fictives, a remplacer (via /admin plus tard).
insert into services (id, name, duration_min, price_cents, sort) values
  ('coupe',       'Coupe',            40, 2000, 1),
  ('barbe',       'Barbe',            40, 1200, 2),
  ('coupe-barbe', 'Coupe + barbe',    40, 3000, 3),
  ('enfant',      'Enfant (-12 ans)', 40, 1500, 4)
on conflict (id) do nothing;

-- ---------------------------------------------------------------- horaires (heure de Paris)
create table if not exists opening_hours (
  weekday    smallint primary key check (weekday between 0 and 6), -- 0 = dimanche. Jour absent = ferme.
  start_time time not null,
  end_time   time not null,
  check (end_time > start_time)
);
insert into opening_hours (weekday, start_time, end_time) values
  (1, '11:00', '20:00'), (2, '11:00', '20:00'), (3, '11:00', '20:00'), (4, '11:00', '20:00')
on conflict (weekday) do nothing;

-- ---------------------------------------------------------------- conges / blocages
create table if not exists time_off (
  id        bigint generated always as identity primary key,
  starts_at timestamptz not null,
  ends_at   timestamptz not null,
  reason    text,
  check (ends_at > starts_at)
);

-- ---------------------------------------------------------------- rendez-vous
create table if not exists bookings (
  id                     uuid primary key default gen_random_uuid(),
  service_id             text not null references services (id),
  service_name           text not null,   -- photo au moment de la reservation
  price_cents            integer not null,
  starts_at              timestamptz not null,
  ends_at                timestamptz not null,
  first_name             text not null check (char_length(first_name) between 1 and 60),
  phone                  text not null check (phone ~ '^\+[1-9][0-9]{7,14}$'), -- format E.164
  email                  text check (email is null or char_length(email) <= 254),
  status                 text not null default 'confirmed'
                         check (status in ('confirmed', 'cancelled_client', 'cancelled_barber', 'no_show')),
  source                 text not null default 'web' check (source in ('web', 'admin')),
  cancel_token           text not null unique, -- 256 bits aleatoires. Stocke en clair car les rappels doivent contenir le lien (acces base = cle secrete serveur uniquement)
  ip_hash                text,                 -- anti-spam, jamais l'IP brute
  created_at             timestamptz not null default now(),
  cancelled_at           timestamptz,
  email_reminder_sent_at timestamptz,
  sms_reminder_sent_at   timestamptz,          -- reserve pour plus tard (SMS non active)
  check (ends_at > starts_at)
);

-- Garantie anti double reservation : deux rdv confirmes ne peuvent pas se chevaucher.
-- C'est la base qui refuse (erreur 23P01), pas seulement l'interface.
alter table bookings drop constraint if exists bookings_no_overlap;
alter table bookings add constraint bookings_no_overlap
  exclude using gist (tstzrange(starts_at, ends_at, '[)') with &&) where (status = 'confirmed');

create index if not exists bookings_phone_idx on bookings (phone) where status = 'confirmed';
create index if not exists bookings_starts_idx on bookings (starts_at);
create index if not exists bookings_ip_idx on bookings (ip_hash, created_at);

-- ---------------------------------------------------------------- creation atomique
-- Verifie conges, delais, limite de debit, "un rdv actif par numero", puis insere.
-- Erreurs applicatives (message) : SLOT_TAKEN, TOO_SOON, TOO_FAR, ACTIVE_BOOKING, RATE_LIMITED,
-- SERVICE_UNAVAILABLE, BOOKING_DISABLED. Chevauchement de rdv : code 23P01 (contrainte ci-dessus).
create or replace function create_booking(
  p_service_id text,
  p_starts_at  timestamptz,
  p_first_name text,
  p_phone      text,
  p_email      text,
  p_token      text,
  p_ip_hash    text
) returns bookings
language plpgsql
security invoker
set search_path = public
as $$
declare
  s   booking_settings;
  svc services;
  v_end timestamptz;
  result bookings;
begin
  select * into s from booking_settings where id = 1;
  if not s.booking_enabled then raise exception 'BOOKING_DISABLED'; end if;

  select * into svc from services where id = p_service_id and active;
  if not found then raise exception 'SERVICE_UNAVAILABLE'; end if;

  v_end := p_starts_at + make_interval(mins => svc.duration_min);

  if p_starts_at < now() + make_interval(hours => s.min_lead_hours) then raise exception 'TOO_SOON'; end if;
  if p_starts_at > now() + make_interval(days => s.max_advance_days) then raise exception 'TOO_FAR'; end if;

  -- Serialise les reservations d'un meme numero (deux requetes simultanees ne passent pas toutes les deux).
  perform pg_advisory_xact_lock(hashtextextended(p_phone, 0));

  if p_ip_hash is not null and (
    select count(*) from bookings where ip_hash = p_ip_hash and created_at > now() - interval '1 hour'
  ) >= 5 then raise exception 'RATE_LIMITED'; end if;

  if exists (select 1 from bookings where phone = p_phone and status = 'confirmed' and ends_at > now()) then
    raise exception 'ACTIVE_BOOKING';
  end if;

  if exists (select 1 from time_off where tstzrange(starts_at, ends_at, '[)') && tstzrange(p_starts_at, v_end, '[)')) then
    raise exception 'SLOT_TAKEN';
  end if;

  insert into bookings (service_id, service_name, price_cents, starts_at, ends_at, first_name, phone, email, cancel_token, ip_hash)
  values (svc.id, svc.name, svc.price_cents, p_starts_at, v_end, p_first_name, p_phone, p_email, p_token, p_ip_hash)
  returning * into result;

  return result;
end;
$$;

-- ---------------------------------------------------------------- securite
alter table booking_settings enable row level security;
alter table services         enable row level security;
alter table opening_hours    enable row level security;
alter table time_off         enable row level security;
alter table bookings         enable row level security;

revoke all on function create_booking(text, timestamptz, text, text, text, text, text) from public, anon, authenticated;
grant execute on function create_booking(text, timestamptz, text, text, text, text, text) to service_role;
