-- Social by Chance — registrations
-- Run this once in the Supabase SQL editor (Dashboard → SQL Editor → New query).

create table if not exists public.registrations (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  ref         text        not null unique,          -- SBC-4K9P, shown to the guest and put in the UPI note
  name        text        not null,
  phone       text        not null,                 -- 10 digits, no country code
  email       text        not null,
  gender      text        not null check (gender in ('male', 'female')),
  amount      integer     not null,                 -- rupees, derived on the server from gender
  utr         text,                                 -- 12-digit UPI reference, self-reported by the guest
  utr_at      timestamptz,
  status      text        not null default 'pending'
                          check (status in ('pending', 'submitted', 'paid', 'cancelled')),
  -- pending   : registered, has not told us they paid
  -- submitted : guest entered a UTR. NOT verified. Do not treat as paid.
  -- paid      : a human matched the UTR against the bank statement
  -- cancelled : no-show / refunded / duplicate. Frees the spot.
  note        text                                  -- organiser's own note, admin only
);

create index if not exists registrations_created_at_idx on public.registrations (created_at desc);
create index if not exists registrations_status_idx     on public.registrations (status);

-- One person, one spot. Stops the double-tap duplicate and the "register twice to hold two spots" trick.
create unique index if not exists registrations_phone_live_idx
  on public.registrations (phone)
  where status <> 'cancelled';

-- Lock the table down. Every read and write in this app goes through a Server Action
-- using the service-role key, which bypasses RLS. Enabling RLS with no policies means
-- the anon/public key can do nothing at all, even if it leaks.
alter table public.registrations enable row level security;
