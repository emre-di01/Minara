-- Add prayer_source JSONB to mosque_profiles.
-- Stores either a Diyanet source { source, cityId, cityName }
-- or a calculated source { source, lat, lng, method, locationName }.
-- city_id / city_name stay for backward-compat (TV fallback).
alter table mosque_profiles
  add column if not exists prayer_source jsonb default null;
