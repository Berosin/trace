-- ---------------------------------------------------------------------------
-- TRACE persistence schema for Supabase (Postgres).
-- Run this once in Supabase → SQL Editor → New query → paste → Run.
-- ---------------------------------------------------------------------------

create table if not exists incidents (
  id uuid primary key,
  short_id text unique not null,
  title text not null,
  ticket_ids jsonb not null default '[]'::jsonb,
  root_cause text,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

create table if not exists tickets (
  id uuid primary key,
  short_id text unique not null,
  subject text not null,
  customer text not null,
  channel text not null,
  raw_message text not null,
  status text not null default 'new',
  incident_id uuid references incidents(id),
  diagnostic_state jsonb not null,
  assigned_agent text,
  resolved_by_agent text,
  resolved_summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists ledger_entries (
  seq integer primary key,
  id uuid unique not null,
  ticket_id uuid not null references tickets(id),
  type text not null,
  actor text not null,
  summary text not null,
  detail jsonb,
  at timestamptz not null,
  prev_hash text not null,
  hash text not null
);

create index if not exists idx_ledger_ticket on ledger_entries (ticket_id);
create index if not exists idx_tickets_incident on tickets (incident_id);
create index if not exists idx_tickets_status on tickets (status);

-- Atomic counters for TICK-/INC- short IDs and the ledger's seq numbers.
-- Using a real Postgres UPDATE...RETURNING (wrapped in this function so it's
-- one atomic round trip) avoids the read-then-write race a client-side
-- increment would have under concurrent requests.
create table if not exists counters (
  name text primary key,
  value integer not null default 0
);

insert into counters (name, value) values ('ticket', 100) on conflict (name) do nothing;
insert into counters (name, value) values ('incident', 0) on conflict (name) do nothing;
insert into counters (name, value) values ('ledger_seq', 0) on conflict (name) do nothing;

create or replace function increment_counter(counter_name text)
returns integer as $$
declare
  new_value integer;
begin
  update counters set value = value + 1 where name = counter_name returning value into new_value;
  return new_value;
end;
$$ language plpgsql;

-- This app's backend is the only writer and uses the service role key, which
-- bypasses Row Level Security entirely — so RLS is left off here rather than
-- configured with policies that would never be evaluated. If you later add
-- a public/anon key path (e.g. a read-only client widget), enable RLS on
-- these tables and add explicit policies before doing so.