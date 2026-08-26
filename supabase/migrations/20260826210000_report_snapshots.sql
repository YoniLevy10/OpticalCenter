-- Saved monthly / ad-hoc report snapshots for HQ history view
create table if not exists public.report_snapshots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  label text not null,
  format text not null default 'pdf',
  kpis_json jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists report_snapshots_org_created_idx
  on public.report_snapshots (organization_id, created_at desc);

alter table public.report_snapshots enable row level security;

create policy report_snapshots_select_hq on public.report_snapshots
  for select using (
    exists (
      select 1 from public.memberships m
      where m.profile_id = auth.uid()
        and m.organization_id = report_snapshots.organization_id
        and m.role in (
          'global_admin',
          'global_maintenance',
          'country_manager',
          'regional_manager',
          'store_manager'
        )
    )
  );

create policy report_snapshots_insert_hq on public.report_snapshots
  for insert with check (
    exists (
      select 1 from public.memberships m
      where m.profile_id = auth.uid()
        and m.organization_id = report_snapshots.organization_id
        and m.role in (
          'global_admin',
          'global_maintenance',
          'country_manager',
          'regional_manager'
        )
    )
  );
