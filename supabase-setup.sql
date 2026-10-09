-- Damaged Equipment Reporting System
-- Run this whole script in Supabase Dashboard > SQL Editor.
-- It creates a public submission pathway but restricts reading and acknowledgement to signed-in management users.

create extension if not exists pgcrypto;

create table if not exists public.damage_reports (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  engineer_name text not null check (char_length(trim(engineer_name)) between 1 and 120),
  site text not null check (char_length(trim(site)) between 1 and 160),
  report_date date not null,
  item_name text not null check (char_length(trim(item_name)) between 1 and 160),
  quantity integer not null check (quantity between 1 and 100000),
  serial_number text,
  description text not null check (char_length(trim(description)) between 1 and 3000),
  image_paths text[] not null check (cardinality(image_paths) between 1 and 5),
  acknowledged boolean not null default false,
  acknowledged_by text,
  acknowledged_date date,
  constraint acknowledgement_fields_consistent check (
    (acknowledged = false and acknowledged_by is null and acknowledged_date is null)
    or
    (acknowledged = true and acknowledged_by is not null and acknowledged_date is not null)
  )
);

alter table public.damage_reports enable row level security;

-- Remove broad table permissions first.
revoke all on table public.damage_reports from anon, authenticated;
grant insert (engineer_name, site, report_date, item_name, quantity, serial_number, description, image_paths)
  on table public.damage_reports to anon;
grant select on table public.damage_reports to authenticated;
grant update (acknowledged, acknowledged_by, acknowledged_date)
  on table public.damage_reports to authenticated;

drop policy if exists "Public can submit damage reports" on public.damage_reports;
create policy "Public can submit damage reports"
  on public.damage_reports for insert to anon
  with check (
    acknowledged = false
    and acknowledged_by is null
    and acknowledged_date is null
  );

drop policy if exists "Management can read damage reports" on public.damage_reports;
create policy "Management can read damage reports"
  on public.damage_reports for select to authenticated
  using (true);

drop policy if exists "Management can acknowledge damage reports" on public.damage_reports;
create policy "Management can acknowledge damage reports"
  on public.damage_reports for update to authenticated
  using (true)
  with check (
    acknowledged = true
    and acknowledged_by is not null
    and acknowledged_date is not null
  );

-- Private photo storage bucket. Files are not publicly readable.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('damage-photos', 'damage-photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists "Anyone can upload damage photos" on storage.objects;
create policy "Anyone can upload damage photos"
  on storage.objects for insert to anon
  with check (
    bucket_id = 'damage-photos'
    and (storage.foldername(name))[1] is not null
  );

drop policy if exists "Management can view damage photos" on storage.objects;
create policy "Management can view damage photos"
  on storage.objects for select to authenticated
  using (bucket_id = 'damage-photos');

-- Do not create anonymous SELECT, UPDATE, or DELETE policies for reports or photos.
-- Never put a Supabase secret/service_role key in frontend code.
