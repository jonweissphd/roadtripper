-- Track async match computation status on trips.
-- NULL = idle, 'computing' = in progress, 'done' = finished, 'error' = failed.

alter table public.trips
  add column match_compute_status text,
  add column match_compute_error text,
  add column match_compute_started_at timestamptz;
