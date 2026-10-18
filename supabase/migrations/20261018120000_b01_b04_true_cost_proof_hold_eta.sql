-- B01–B04: true cost ↔ asset, before/after proof role, 30-day quality hold, repair ETA.
-- Additive only; fail-open in app when columns are not yet applied.

-- B01: link spend requests to assets for cumulative true cost
alter table public.spend_requests
  add column if not exists asset_id uuid references public.assets(id) on delete set null;

create index if not exists spend_requests_asset_idx
  on public.spend_requests (asset_id)
  where asset_id is not null;

-- B02: before/after proof role on attachments (kind stays image|video|…)
alter table public.ticket_attachments
  add column if not exists proof_role text;

comment on column public.ticket_attachments.proof_role is
  'before | after | null — repair proof pair for resolve gate';

-- B03: 30-day quality hold before final close
alter table public.tickets
  add column if not exists quality_hold_until timestamptz,
  add column if not exists quality_hold_started_at timestamptz;

create index if not exists tickets_quality_hold_until_idx
  on public.tickets (quality_hold_until)
  where quality_hold_until is not null and status = 'resolved';

-- B04: repair ETA visible to HQ / store
alter table public.tickets
  add column if not exists repair_eta_at timestamptz;

create index if not exists tickets_repair_eta_idx
  on public.tickets (repair_eta_at)
  where repair_eta_at is not null;
