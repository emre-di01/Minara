create table mosque_profiles (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  name       text not null default '',
  address    text not null default '',
  logo_url   text,
  city_id    integer,
  created_at timestamptz not null default now()
);

alter table mosque_profiles enable row level security;

create policy "profile_owner_select" on mosque_profiles
  for select using (user_id = auth.uid());

create policy "profile_owner_insert" on mosque_profiles
  for insert with check (user_id = auth.uid());

create policy "profile_owner_update" on mosque_profiles
  for update using (user_id = auth.uid());

grant all on mosque_profiles to authenticated;
