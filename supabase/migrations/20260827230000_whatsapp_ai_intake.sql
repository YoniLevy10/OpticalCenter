-- WhatsApp AI Intake Agent: session fields, message log, ticket AI audit columns

alter table public.intake_sessions
  add column if not exists clarification_count integer not null default 0,
  add column if not exists draft_payload jsonb,
  add column if not exists active_ticket_id uuid references public.tickets(id) on delete set null;

comment on column public.intake_sessions.state is
  'awaiting_store | awaiting_description | awaiting_clarification | done';
comment on column public.intake_sessions.clarification_count is
  'Number of clarification questions asked in this intake (max 2)';
comment on column public.intake_sessions.draft_payload is
  'Last AI/rules intake draft before ticket creation';

alter table public.tickets
  add column if not exists ai_summary text,
  add column if not exists ai_raw jsonb;

comment on column public.tickets.ai_summary is
  'Concise AI-extracted issue summary from WhatsApp intake';
comment on column public.tickets.ai_raw is
  'Raw AI intake JSON + rules overrides for audit';

create table if not exists public.whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  country_id uuid not null references public.countries(id) on delete cascade,
  wa_id text not null,
  direction text not null check (direction in ('inbound', 'outbound')),
  body text,
  meta_message_id text,
  media_kind text,
  ticket_id uuid references public.tickets(id) on delete set null,
  intake_session_id uuid references public.intake_sessions(id) on delete set null,
  created_at timestamptz not null default now()
);

create unique index if not exists whatsapp_messages_meta_message_id_uidx
  on public.whatsapp_messages (meta_message_id)
  where meta_message_id is not null;

create index if not exists whatsapp_messages_wa_created_idx
  on public.whatsapp_messages (country_id, wa_id, created_at desc);

alter table public.whatsapp_messages enable row level security;

-- Server/service-role only (no authenticated client policies)
drop policy if exists whatsapp_messages_deny_all on public.whatsapp_messages;
create policy whatsapp_messages_deny_all on public.whatsapp_messages
  for all
  using (false)
  with check (false);
