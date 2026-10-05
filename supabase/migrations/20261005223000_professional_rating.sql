alter table public.professionals
  add column if not exists internal_rating smallint;

alter table public.professionals
  drop constraint if exists professionals_internal_rating_range;

alter table public.professionals
  add constraint professionals_internal_rating_range
  check (internal_rating is null or internal_rating between 1 and 5);
