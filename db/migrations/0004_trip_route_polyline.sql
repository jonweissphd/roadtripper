-- Cache the route polyline at match-compute time so the map can render it
-- without burning a separate Directions call on every page view.
alter table public.trips add column route_polyline text;
