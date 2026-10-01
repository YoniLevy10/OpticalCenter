-- Durable queue for WhatsApp Graph send failures (retry via cron).
-- Adapted from Bino failed_notifications for MaintainOS retail ops.

create table if not exists public.whatsapp_send_failures (
  id uuid primary key default gen_random_uuid(),
  to_wa_id text not null,
  purpose text not null default 'ops_reply',
  send_kind text not null check (send_kind in ('text', 'template')),
  payload jsonb not null default '{}'::jsonb,
  phone_number_id text,
  ticket_id uuid references public.tickets(id) on delete set null,
  meta_error_code integer,
  meta_error_message text,
  attempts integer not null default 0,
  max_attempts integer not null default 5,
  next_retry_at timestamptz not null default now(),
  status text not null default 'pending'
    check (status in ('pending', 'sent', 'exhausted', 'cancelled')),
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists whatsapp_send_failures_retry_idx
  on public.whatsapp_send_failures (status, next_retry_at)
  where status = 'pending';

create index if not exists whatsapp_send_failures_ticket_idx
  on public.whatsapp_send_failures (ticket_id)
  where ticket_id is not null;

alter table public.whatsapp_send_failures enable row level security;
