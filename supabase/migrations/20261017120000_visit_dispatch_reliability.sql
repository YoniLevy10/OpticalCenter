-- C01: honest dispatch statuses, partial visits, visit idempotency.

-- vendor_dispatches: allow 'labeled' (queued for vendor without live channel)
alter table public.vendor_dispatches
  drop constraint if exists vendor_dispatches_status_check;

alter table public.vendor_dispatches
  add constraint vendor_dispatches_status_check
  check (status in ('queued', 'sent', 'failed', 'ack', 'labeled'));

alter table public.vendor_dispatches
  add column if not exists last_error text;

-- service_visits: partial outcome + client idempotency
alter table public.service_visits
  drop constraint if exists service_visits_status_check;

alter table public.service_visits
  add constraint service_visits_status_check
  check (status in ('planned', 'dispatched', 'partial', 'in_progress', 'done', 'cancelled'));

alter table public.service_visits
  add column if not exists idempotency_key text;

create unique index if not exists service_visits_org_idempotency_uidx
  on public.service_visits (organization_id, idempotency_key)
  where idempotency_key is not null;
