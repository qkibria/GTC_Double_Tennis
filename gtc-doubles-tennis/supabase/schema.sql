-- Greenford Tennis Club (GTC) Doubles Tennis — Supabase schema
--
-- Run this once in your Supabase project's SQL Editor (see README.md for
-- exact steps). It creates the two tables the app needs, and sets up
-- security rules so that:
--   - ANYONE can view players, matches, and results (read-only)
--   - ONLY a logged-in admin can add/edit/delete players, generate
--     matches, edit pairings, or enter results

-- ---------- Tables ----------

create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  rating int not null default 5,
  created_at timestamptz not null default now()
);

create table if not exists weeks (
  id uuid primary key default gen_random_uuid(),
  date date not null unique,
  num_rounds int not null default 3,
  rounds jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- Security (Row Level Security) ----------

alter table players enable row level security;
alter table weeks enable row level security;

-- Anyone (including visitors who aren't logged in) can view data
create policy "Public can view players"
  on players for select
  using (true);

create policy "Public can view weeks"
  on weeks for select
  using (true);

-- Only a logged-in (authenticated) user can add, edit, or delete
create policy "Admins can add players"
  on players for insert
  to authenticated
  with check (true);

create policy "Admins can edit players"
  on players for update
  to authenticated
  using (true)
  with check (true);

create policy "Admins can delete players"
  on players for delete
  to authenticated
  using (true);

create policy "Admins can add weeks"
  on weeks for insert
  to authenticated
  with check (true);

create policy "Admins can edit weeks"
  on weeks for update
  to authenticated
  using (true)
  with check (true);

create policy "Admins can delete weeks"
  on weeks for delete
  to authenticated
  using (true);
