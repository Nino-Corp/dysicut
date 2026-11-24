-- Dysicut : absences (lapins), blocage de numeros et acomptes Stripe.
-- A coller dans Supabase > SQL Editor > Run, apres 0001 et 0002. Idempotent autant que possible.

-- ---------------------------------------------------------------- reglages
alter table booking_settings add column if not exists no_show_block_threshold smallint not null default 2
  check (no_show_block_threshold between 0 and 20);              -- 0 = pas de blocage automatique
alter table booking_settings add column if not exists deposit_mode text not null default 'off'
  check (deposit_mode in ('off', 'flagged', 'all'));              -- off | clients deja absents | tout le monde
alter table booking_settings add column if not exists deposit_cents integer not null default 500
  check (deposit_cents between 50 and 20000);                     -- Stripe : minimum 0,50 EUR en euros

-- ---------------------------------------------------------------- numeros bloques / debloques
-- blocked = blocage manuel. lifted_at = le barber a "pardonne" : seules les absences APRES cette date comptent.
create table if not exists phone_blocks (
  phone      text primary key check (phone ~ '^\+[1-9][0-9]{7,14}$'),
  blocked    boolean not null default false,
  lifted_at  timestamptz,
  note       text,
  updated_at timestamptz not null default now()
);
alter table phone_blocks enable row level security;

-- ---------------------------------------------------------------- rdv : statuts et paiement
alter table bookings drop constraint if exists bookings_status_check;
alter table bookings add constraint bookings_status_check
  check (status in ('pending_payment', 'confirmed', 'cancelled_client', 'cancelled_barber', 'no_show', 'expired'));

alter table bookings add column if not exists deposit_cents integer not null default 0 check (deposit_cents >= 0);
alter table bookings add column if not exists payment_status text not null default 'none'
  check (payment_status in ('none', 'pending', 'paid', 'refunded', 'forfeited'));
alter table bookings add column if not exists hold_expires_at timestamptz;   -- fin de la reservation provisoire (paiement en attente)
alter table bookings add column if not exists stripe_session_id text unique;
alter table bookings add column if not exists stripe_payment_intent text;
alter table bookings add column if not exists checkout_url text;

-- Un creneau en attente de paiement le reste "occupe" : la contrainte couvre confirmed ET pending_payment.
-- Les reservations provisoires expirees sont passees en 'expired' avant chaque nouvelle reservation.
alter table bookings drop constraint if exists bookings_no_overlap;
alter table bookings add constraint bookings_no_overlap
  exclude using gist (tstzrange(starts_at, ends_at, '[)') with &&) where (status in ('confirmed', 'pending_payment'));

create index if not exists bookings_noshow_idx on bookings (phone) where status = 'no_show';

-- ---------------------------------------------------------------- creation atomique (remplace la version 0001)
-- Erreurs applicatives (message) : SLOT_TAKEN, TOO_SOON, TOO_FAR, ACTIVE_BOOKING, RATE_LIMITED,
-- SERVICE_UNAVAILABLE, BOOKING_DISABLED, PHONE_BLOCKED. Chevauchement : code 23P01.
-- p_deposit_allowed = Stripe est configure cote serveur. Si l'acompte est requis, le rdv est cree en
-- 'pending_payment' avec une reservation provisoire de p_hold_minutes ; sinon il est 'confirmed'.
drop function if exists create_booking(text, timestamptz, text, text, text, text, text);

create or replace function create_booking(
  p_service_id      text,
  p_starts_at       timestamptz,
  p_first_name      text,
  p_phone           text,
  p_email           text,
  p_token           text,
  p_ip_hash         text,
  p_deposit_allowed boolean default false,
  p_hold_minutes    integer default 35
) returns bookings
language plpgsql
security invoker
set search_path = public
as $$
declare
  s   booking_settings;
  svc services;
  blk phone_blocks;
  v_end timestamptz;
  v_noshows integer;
  v_deposit integer := 0;
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

  -- Libere les reservations provisoires dont le paiement n'est jamais venu.
  update bookings set status = 'expired', payment_status = 'none'
   where status = 'pending_payment' and hold_expires_at < now();

  if p_ip_hash is not null and (
    select count(*) from bookings where ip_hash = p_ip_hash and created_at > now() - interval '1 hour'
  ) >= 5 then raise exception 'RATE_LIMITED'; end if;

  -- Absences : blocage manuel, ou seuil atteint depuis le dernier "pardon" du barber.
  select * into blk from phone_blocks where phone = p_phone;
  select count(*) into v_noshows from bookings
   where phone = p_phone and status = 'no_show' and (blk.lifted_at is null or starts_at > blk.lifted_at);
  if coalesce(blk.blocked, false) or (s.no_show_block_threshold > 0 and v_noshows >= s.no_show_block_threshold) then
    raise exception 'PHONE_BLOCKED';
  end if;

  if exists (select 1 from bookings where phone = p_phone and status in ('confirmed', 'pending_payment') and ends_at > now()) then
    raise exception 'ACTIVE_BOOKING';
  end if;

  if exists (select 1 from time_off where tstzrange(starts_at, ends_at, '[)') && tstzrange(p_starts_at, v_end, '[)')) then
    raise exception 'SLOT_TAKEN';
  end if;

  -- Acompte : tout le monde, ou seulement les numeros deja absents. Jamais plus que le prix de la prestation.
  if p_deposit_allowed and s.deposit_mode <> 'off' and (s.deposit_mode = 'all' or v_noshows >= 1) then
    v_deposit := least(s.deposit_cents, svc.price_cents);
    if v_deposit < 50 then v_deposit := 0; end if; -- sous le minimum Stripe : pas d'acompte
  end if;

  insert into bookings (service_id, service_name, price_cents, starts_at, ends_at, first_name, phone, email, cancel_token, ip_hash,
                        status, deposit_cents, payment_status, hold_expires_at)
  values (svc.id, svc.name, svc.price_cents, p_starts_at, v_end, p_first_name, p_phone, p_email, p_token, p_ip_hash,
          case when v_deposit > 0 then 'pending_payment' else 'confirmed' end,
          v_deposit,
          case when v_deposit > 0 then 'pending' else 'none' end,
          case when v_deposit > 0 then now() + make_interval(mins => p_hold_minutes) else null end)
  returning * into result;

  return result;
end;
$$;

revoke all on function create_booking(text, timestamptz, text, text, text, text, text, boolean, integer) from public, anon, authenticated;
grant execute on function create_booking(text, timestamptz, text, text, text, text, text, boolean, integer) to service_role;
