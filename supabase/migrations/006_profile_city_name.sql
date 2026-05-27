alter table mosque_profiles add column if not exists city_name text;

-- TV uses anon key — needs to read the profile to get mosque name/city for slides
create policy "profile_anon_select" on mosque_profiles
  for select to anon using (true);
