-- Ari production path: urgent flag, engaged status, locked visit price.

alter table public.tickets
  add column if not exists urgent boolean;

update public.tickets
  set urgent = priority in ('critical', 'high')
  where urgent is null;

alter table public.tickets
  alter column urgent set default false;

alter table public.tickets
  alter column urgent set not null;

alter type public.ticket_status add value if not exists 'engaged';

create table if not exists public.engagements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  store_code text not null default '',
  store_name text not null default '',
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  bundled_ticket_ids uuid[] not null default '{}',
  midrag_sp_id text,
  professional_name text not null,
  professional_phone text not null,
  approved_amount numeric not null,
  approved_by text not null,
  approved_at timestamptz not null default now(),
  status text not null default 'locked' check (status in ('locked', 'cancelled')),
  closed_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists engagements_one_lock_per_ticket
  on public.engagements (ticket_id)
  where status = 'locked';

create index if not exists engagements_store_closed_idx
  on public.engagements (store_id, closed_at);

alter table public.engagements enable row level security;

do $$
begin
  create policy service_role_bypass_engagements on public.engagements
    for all to service_role using (true) with check (true);
exception
  when duplicate_object then null;
end
$$;
