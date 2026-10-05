-- Ari control center: statuses, spend gate, documents, tasks, directory audit.

alter type public.ticket_status add value if not exists 'awaiting_info';
alter type public.ticket_status add value if not exists 'waiting_vendor';

alter table public.tickets
  add column if not exists next_action text,
  add column if not exists follow_up_at timestamptz,
  add column if not exists vendor_contact text,
  add column if not exists order_ref text;

alter table public.stores
  add column if not exists area_manager text;

create table if not exists public.store_code_aliases (
  store_id uuid not null references public.stores(id) on delete cascade,
  code text not null,
  primary key (store_id, code)
);

create table if not exists public.store_contacts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  full_name text not null,
  phone text not null,
  phone_status text not null default 'ok',
  role_label text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.store_contact_links (
  contact_id uuid not null references public.store_contacts(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  primary key (contact_id, store_id)
);

create table if not exists public.directory_audit (
  id uuid primary key default gen_random_uuid(),
  actor text not null,
  entity text not null,
  entity_id text not null,
  field text not null,
  previous text not null default '',
  next text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.spend_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  store_id uuid references public.stores(id) on delete set null,
  ticket_id uuid references public.tickets(id) on delete set null,
  reason text not null,
  vendor_name text,
  requested_amount numeric not null,
  approved_amount numeric,
  actual_amount numeric,
  scope text,
  status text not null default 'pending',
  urgent boolean not null default false,
  needs_reapproval boolean not null default false,
  requested_by text,
  decided_by text,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.store_documents (
  id uuid primary key default gen_random_uuid(),
  store_id uuid references public.stores(id) on delete set null,
  doc_type text not null,
  source_url text,
  extracted_expiry timestamptz,
  computed_next_check timestamptz,
  owner_name text,
  intake_status text not null default 'needs_review',
  intake_reason text,
  version int not null default 1,
  previous_id uuid,
  renewed boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.ops_tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  store_id uuid references public.stores(id) on delete set null,
  assignee text,
  due_at timestamptz,
  ticket_id uuid references public.tickets(id) on delete set null,
  document_id uuid,
  spend_id uuid,
  done boolean not null default false,
  needs_clarification boolean not null default false,
  clarification text,
  created_at timestamptz not null default now()
);

create table if not exists public.ingested_files (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  mime text not null default '',
  source_url text,
  doc_type text,
  store_code text,
  status text not null default 'needs_review',
  reason text,
  version_of text,
  deleted_in_source boolean not null default false,
  created_at timestamptz not null default now()
);

-- Approved label changes. Identity stays on stores.id.
update public.stores
set code = '6030', name = 'כפר סבא 1 עתיר'
where code = '104';

update public.stores
set code = '6045'
where code = '118';

update public.stores
set code = '6018'
where code = '126';
