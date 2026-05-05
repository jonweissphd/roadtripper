-- Profiles: 1:1 with auth.users
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Predefined interest taxonomy (read-only for clients, seeded server-side)
create table public.interests (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  label text not null,
  category text not null,
  search_keywords text[] not null default '{}'
);
create index interests_category_idx on public.interests (category);

-- Many-to-many: user <-> interest
create table public.profile_interests (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  interest_id uuid not null references public.interests(id) on delete cascade,
  primary key (profile_id, interest_id)
);
create index profile_interests_interest_idx on public.profile_interests (interest_id);

-- updated_at trigger
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- Enable RLS on all three tables
alter table public.profiles enable row level security;
alter table public.interests enable row level security;
alter table public.profile_interests enable row level security;

-- Profiles: self-only for v1. M4 will extend to partner-visibility via security-definer helper.
create policy "profiles_self_select" on public.profiles
  for select using (id = auth.uid());

create policy "profiles_self_insert" on public.profiles
  for insert with check (id = auth.uid());

create policy "profiles_self_update" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- Interests: any authenticated user can read. No client mutations.
create policy "interests_read_all" on public.interests
  for select to authenticated using (true);

-- Profile_interests: full CRUD on own. M4 will extend select to partners.
create policy "profile_interests_self_select" on public.profile_interests
  for select using (profile_id = auth.uid());

create policy "profile_interests_self_insert" on public.profile_interests
  for insert with check (profile_id = auth.uid());

create policy "profile_interests_self_delete" on public.profile_interests
  for delete using (profile_id = auth.uid());
