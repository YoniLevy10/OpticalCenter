-- C07: RFQ drafts + manually captured quotes (no auto-send).
-- Status is always 'draft' in v1 — sending to vendors is decision-blocked.

create table if not exists public.rfq_drafts (
  id text primary key,
  organization_id uuid references public.organizations(id) on delete cascade,
  status text not null default 'draft' check (status = 'draft'),
  store_id text,
  store_code text,
  store_name text,
  trade text not null,
  ticket_ids text[] not null default '{}',
  document_notes text[] not null default '{}',
  timing_note text,
  body_text text not null default '',
  recipient_hints text[] not null default '{}',
  quotes jsonb not null default '[]'::jsonb,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.rfq_drafts is
  'C07 RFQ drafts for Ari — compose outreach; capture real quotes manually; never auto-send or invent prices.';

create index if not exists idx_rfq_drafts_org_updated
  on public.rfq_drafts (organization_id, updated_at desc);

create index if not exists idx_rfq_drafts_ticket_ids
  on public.rfq_drafts using gin (ticket_ids);

alter table public.rfq_drafts enable row level security;

do $$
begin
  create policy service_role_bypass_rfq_drafts on public.rfq_drafts
    for all to service_role using (true) with check (true);
exception
  when duplicate_object then null;
end
$$;
