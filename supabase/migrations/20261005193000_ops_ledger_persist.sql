-- Persist Ari's ledger (files, documents, spend, tasks) and lock it to the server.

alter table public.ingested_files
  add column if not exists client_id text,
  add column if not exists extracted_text text,
  add column if not exists stage text;

alter table public.store_documents
  add column if not exists client_id text,
  add column if not exists store_code text,
  add column if not exists store_name text,
  add column if not exists previous_client_id text;

alter table public.spend_requests
  add column if not exists client_id text,
  add column if not exists store_code text,
  add column if not exists store_name text;

alter table public.ops_tasks
  add column if not exists client_id text,
  add column if not exists store_code text;

create unique index if not exists ingested_files_client_id_idx
  on public.ingested_files (client_id);
create unique index if not exists store_documents_client_id_idx
  on public.store_documents (client_id);
create unique index if not exists spend_requests_client_id_idx
  on public.spend_requests (client_id);
create unique index if not exists ops_tasks_client_id_idx
  on public.ops_tasks (client_id);

alter table public.ingested_files enable row level security;
alter table public.store_documents enable row level security;
alter table public.spend_requests enable row level security;
alter table public.ops_tasks enable row level security;
alter table public.store_contacts enable row level security;
alter table public.store_contact_links enable row level security;
alter table public.directory_audit enable row level security;
