-- Preferred vendor pool (Optical Center national coverage) + store close confirmation stamp.
-- Fixly remains OFF (product flag); vendors.preferred is the primary dispatch path.

alter table public.vendors
  add column if not exists preferred boolean not null default false,
  add column if not exists coverage_regions text[] not null default '{}'::text[],
  add column if not exists notes text;

create index if not exists vendors_preferred_idx
  on public.vendors (organization_id, preferred)
  where preferred = true and active = true;

alter table public.tickets
  add column if not exists store_confirmed_at timestamptz,
  add column if not exists store_confirmed_by text;

comment on column public.vendors.preferred is
  'Preferred Optical Center contracted vendor — matched before any marketplace backup.';
comment on column public.vendors.coverage_regions is
  'IL district codes: TA CTR JLM HFA N S';
comment on column public.tickets.store_confirmed_at is
  'When store staff confirmed the fix; used to auto-close without Ari chasing.';
