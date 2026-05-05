-- Trips: strict 1:1, designed for the v1 invite flow.
create table public.trips (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles(id) on delete cascade,
  guest_id uuid references public.profiles(id) on delete cascade,
  name text,
  origin_address text not null,
  origin_lat double precision not null,
  origin_lng double precision not null,
  origin_place_id text,
  dest_address text not null,
  dest_lat double precision not null,
  dest_lng double precision not null,
  dest_place_id text,
  corridor_miles int not null default 10,
  status text not null default 'pending', -- pending | active | archived
  invite_token text unique not null,
  matches_computed_at timestamptz,
  created_at timestamptz not null default now()
);

create index trips_creator_idx on public.trips (creator_id);
create index trips_guest_idx on public.trips (guest_id);
-- invite_token already has a unique index from the unique constraint.

alter table public.trips enable row level security;

-- Trips RLS: creator and (when set) guest can read.
-- Invite acceptance is handled via a server route using service role (token-validated),
-- so direct insert/update is restricted to the creator.
create policy "trips_self_select" on public.trips
  for select using (auth.uid() = creator_id or auth.uid() = guest_id);

create policy "trips_creator_insert" on public.trips
  for insert with check (auth.uid() = creator_id);

create policy "trips_creator_update" on public.trips
  for update using (auth.uid() = creator_id) with check (auth.uid() = creator_id);

-- Helper: is target_id a trip-partner of auth.uid()?
-- Security definer so it bypasses RLS on trips when evaluated inside other policies
-- (otherwise we'd recurse on profiles → trips → profiles).
create or replace function public.is_trip_partner(target_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.trips t
    where (t.creator_id = auth.uid() and t.guest_id = target_id)
       or (t.guest_id = auth.uid() and t.creator_id = target_id)
  );
$$;

-- Extend profile read access: self OR partner.
drop policy if exists "profiles_self_select" on public.profiles;
create policy "profiles_self_or_partner_select" on public.profiles
  for select using (id = auth.uid() or public.is_trip_partner(id));

-- Extend profile_interests read access: self OR partner.
drop policy if exists "profile_interests_self_select" on public.profile_interests;
create policy "profile_interests_self_or_partner_select" on public.profile_interests
  for select using (profile_id = auth.uid() or public.is_trip_partner(profile_id));

-- Auto-create a profile row when a new auth.users row is inserted.
-- display_name defaults to the email's local-part; user can change it on /profile.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(split_part(new.email, '@', 1), 'user'))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill profiles for any users who signed up before this migration.
insert into public.profiles (id, display_name)
select u.id, coalesce(split_part(u.email, '@', 1), 'user')
from auth.users u
on conflict (id) do nothing;
