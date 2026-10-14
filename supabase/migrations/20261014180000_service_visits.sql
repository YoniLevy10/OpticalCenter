-- Combined service visits: one store visit covering multiple tickets.

create table if not exists public.service_visits (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  vendor_id uuid references public.vendors(id) on delete set null,
  status text not null default 'planned'
    check (status in ('planned', 'dispatched', 'in_progress', 'done', 'cancelled')),
  scheduled_at timestamptz,
  created_by uuid,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists service_visits_store_idx
  on public.service_visits (store_id, created_at desc);

create index if not exists service_visits_org_idx
  on public.service_visits (organization_id, created_at desc);

create table if not exists public.service_visit_tickets (
  visit_id uuid not null references public.service_visits(id) on delete cascade,
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (visit_id, ticket_id)
);

create index if not exists service_visit_tickets_ticket_idx
  on public.service_visit_tickets (ticket_id);

alter table public.vendor_dispatches
  add column if not exists visit_id uuid references public.service_visits(id) on delete set null;

create index if not exists vendor_dispatches_visit_idx
  on public.vendor_dispatches (visit_id)
  where visit_id is not null;
