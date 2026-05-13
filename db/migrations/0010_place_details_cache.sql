-- Cache Google Places API detail responses to avoid redundant fetches.
-- Entries expire after 14 days; the app checks fetched_at before using.

create table public.place_details_cache (
  google_place_id text primary key,
  details jsonb not null,
  fetched_at timestamptz not null default now()
);

-- Index for cleanup queries that purge old entries.
create index place_details_cache_fetched_idx
  on public.place_details_cache (fetched_at);

-- Only accessed via service-role admin client (no user-facing RLS policies).
alter table public.place_details_cache enable row level security;
