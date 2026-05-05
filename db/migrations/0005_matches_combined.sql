-- Track whether the latest match compute included the partner's interests.
-- True iff guest_id was non-null at compute time. Used by the trip page to
-- show a "stale — refresh combined" banner when the partner joined after the
-- creator already computed solo matches.
alter table public.trips
  add column matches_combined boolean not null default false;
