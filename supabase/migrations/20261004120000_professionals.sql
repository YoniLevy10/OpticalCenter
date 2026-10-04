-- External professionals contact book (Midrag / manual) — ranked by use.
-- Adapted from Bino professionals for MILO retail ops (org-scoped, not client_id).

create table if not exists public.professionals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  full_name text not null,
  phone text,
  trade text,
  midrag_sector_id integer,
  midrag_service_id integer,
  company_name text,
  notes text,
  source text not null default 'manual'
    check (source in ('manual', 'midrag', 'vendor')),
  is_active boolean not null default true,
  use_count integer not null default 0,
  last_contacted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

comment on table public.professionals is
  'External trades contact book — ranked by use_count / last_contacted_at for quick recall + dial.';

create index if not exists idx_professionals_org_active
  on public.professionals (organization_id, is_active)
  where deleted_at is null;

create index if not exists idx_professionals_rank
  on public.professionals (use_count desc, last_contacted_at desc nulls last)
  where deleted_at is null and is_active;

create unique index if not exists professionals_phone_org_unique
  on public.professionals (phone, organization_id)
  where phone is not null and deleted_at is null;

alter table public.professionals enable row level security;

do $$
begin
  create policy service_role_bypass_professionals on public.professionals
    for all to service_role using (true) with check (true);
exception
  when duplicate_object then null;
end
$$;
