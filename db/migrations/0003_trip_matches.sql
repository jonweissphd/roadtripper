create table public.trip_matches (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  google_place_id text not null,
  name text not null,
  formatted_address text,
  lat double precision not null,
  lng double precision not null,
  detour_seconds int not null,
  rating numeric(2,1),
  review_count int,
  primary_photo_id text,                       -- photo IDs are stable; URLs are short-lived (proxy fetches them)
  matched_interests text[] not null default '{}', -- interest slugs that this place hit
  shared_tags_count int not null default 0,
  editorial_score numeric,                     -- 0-10 from Gemini rerank
  editorial_reasoning text,
  raw jsonb,                                   -- full Place Details snapshot at compute time
  created_at timestamptz not null default now(),
  unique (trip_id, google_place_id)
);

create index trip_matches_trip_idx on public.trip_matches (trip_id);

alter table public.trip_matches enable row level security;

-- Read access: anyone on the trip
create policy "trip_matches_trip_select" on public.trip_matches
  for select using (
    exists (
      select 1 from public.trips t
      where t.id = trip_id
        and (t.creator_id = auth.uid() or t.guest_id = auth.uid())
    )
  );

-- Writes only via service role (matching engine), so no insert/update/delete policies for users.
