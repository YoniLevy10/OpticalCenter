-- Phase 6: persist ops subsystems (settings, vendors, inbox takeover, push)

-- ---------------------------------------------------------------------------
-- App settings (per organization)
-- ---------------------------------------------------------------------------

create table public.app_settings (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  brand_name text not null default 'Optical Center',
  country_label text not null default 'ישראל · עברית',
  wa_business_phone text not null default '',
  sla_respond_hours_critical int not null default 2,
  sla_respond_hours_high int not null default 4,
  sla_respond_hours_medium int not null default 8,
  sla_respond_hours_low int not null default 24,
  notify_email text not null default '',
  updated_at timestamptz not null default now()
);

create trigger app_settings_set_updated_at
before update on public.app_settings
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- External vendors + partner dispatches
-- ---------------------------------------------------------------------------

create table public.vendors (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  contact_phone text,
  contact_email text,
  specialties text not null default 'general',
  active boolean not null default true,
  webhook_url text,
  hmac_secret text,
  created_at timestamptz not null default now()
);

create index vendors_org_idx on public.vendors (organization_id);

create table public.vendor_dispatches (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  idempotency_key text not null,
  status text not null default 'queued'
    check (status in ('queued', 'sent', 'failed', 'ack')),
  request_hmac text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (ticket_id, idempotency_key)
);

create trigger vendor_dispatches_set_updated_at
before update on public.vendor_dispatches
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Inbox takeover fields on intake sessions
-- ---------------------------------------------------------------------------

alter table public.intake_sessions
  add column if not exists human_takeover boolean not null default false,
  add column if not exists last_inbound text;

-- ---------------------------------------------------------------------------
-- Web push subscriptions
-- ---------------------------------------------------------------------------

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create index push_subscriptions_profile_idx on public.push_subscriptions (profile_id);

-- ---------------------------------------------------------------------------
-- Inbox thread messages (HQ human replies + captured inbound)
-- ---------------------------------------------------------------------------

create table public.inbox_messages (
  id uuid primary key default gen_random_uuid(),
  country_id uuid not null references public.countries(id) on delete cascade,
  wa_id text not null,
  direction text not null check (direction in ('inbound', 'outbound')),
  body text not null,
  ticket_id uuid references public.tickets(id) on delete set null,
  created_at timestamptz not null default now()
);

create index inbox_messages_wa_idx on public.inbox_messages (country_id, wa_id, created_at desc);

-- ---------------------------------------------------------------------------
-- RLS (HQ authenticated read/write — tighten with memberships later)
-- ---------------------------------------------------------------------------

alter table public.app_settings enable row level security;
alter table public.vendors enable row level security;
alter table public.vendor_dispatches enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.inbox_messages enable row level security;

create policy app_settings_rw on public.app_settings
  for all to authenticated using (true) with check (true);

create policy vendors_rw on public.vendors
  for all to authenticated using (true) with check (true);

create policy vendor_dispatches_rw on public.vendor_dispatches
  for all to authenticated using (true) with check (true);

create policy push_subscriptions_rw on public.push_subscriptions
  for all to authenticated using (true) with check (true);

create policy inbox_messages_rw on public.inbox_messages
  for all to authenticated using (true) with check (true);

-- Service role bypasses RLS for webhooks/cron
