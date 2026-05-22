-- Screens
create table screens (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references auth.users(id) on delete cascade,
  name          text not null,
  hardware_id   text not null unique,
  orientation   text not null default 'landscape' check (orientation in ('landscape', 'portrait')),
  playlist_id   uuid,
  city_id       integer,
  paired        boolean not null default false,
  last_seen_at  timestamptz,
  created_at    timestamptz not null default now()
);

-- Playlists
create table playlists (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  theme      text not null default 'classic',
  widgets    jsonb not null default '[]',
  created_at timestamptz not null default now()
);

-- Pairing codes (anonymous insert erlaubt — TV hat noch keine Auth)
create table pairing_codes (
  code        text primary key,
  hardware_id text not null unique,
  created_at  timestamptz not null default now()
);

-- FK: screens → playlists
alter table screens
  add constraint fk_screens_playlist
  foreign key (playlist_id) references playlists(id) on delete set null;

-- RLS aktivieren
alter table screens enable row level security;
alter table playlists enable row level security;
-- pairing_codes: kein RLS nötig (temporäre 6-stellige Codes, keine sensiblen Daten)
-- alter table pairing_codes enable row level security;

-- Hilfsfunktion für RLS
create or replace function owns_mosque()
returns uuid language sql stable security definer as $$
  select auth.uid()
$$;

-- Screens: nur eigene
create policy "screens_owner" on screens
  using (owner_id = owns_mosque());

create policy "screens_owner_insert" on screens
  for insert with check (owner_id = auth.uid());

-- Playlists: nur eigene
create policy "playlists_owner" on playlists
  using (owner_id = owns_mosque());

create policy "playlists_owner_insert" on playlists
  for insert with check (owner_id = auth.uid());

-- Pairing codes: anonymous insert+delete (TV), lesen nur angemeldete User
create policy "pairing_anon_insert" on pairing_codes
  for insert to anon with check (true);

create policy "pairing_anon_delete" on pairing_codes
  for delete to anon using (true);

create policy "pairing_auth_select" on pairing_codes
  for select to authenticated using (true);

create policy "pairing_auth_delete" on pairing_codes
  for delete to authenticated using (true);

-- Screens: anon darf last_seen_at updaten (Heartbeat) und pairing lesen
create policy "screens_anon_heartbeat" on screens
  for update to anon
  using (true)
  with check (true);

create policy "screens_anon_select" on screens
  for select to anon using (true);

-- Grants für anon (TV hat keine Auth-Session)
grant insert on pairing_codes to anon;
grant select, update on screens to anon;
grant select on playlists to anon;

-- Grants für authenticated (CMS)
grant all on screens to authenticated;
grant all on playlists to authenticated;
grant all on pairing_codes to authenticated;

-- Realtime für Screens aktivieren
alter publication supabase_realtime add table screens;
