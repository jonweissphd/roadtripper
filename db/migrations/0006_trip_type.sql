-- Support "explore" mode: search around a single location instead of along a route.
-- For explore trips, dest fields mirror origin. trip_type distinguishes the two.
alter table public.trips
  add column trip_type text not null default 'road_trip';

comment on column public.trips.trip_type is 'road_trip | explore';
