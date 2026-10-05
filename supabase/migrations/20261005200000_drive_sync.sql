-- Two-way Drive sync: remember the folder Ari keeps, and which file each row mirrors.

alter table public.ingested_files
  add column if not exists drive_file_id text,
  add column if not exists drive_modified_time timestamptz,
  add column if not exists origin text,
  add column if not exists local_updated_at timestamptz;

alter table public.store_documents
  add column if not exists drive_file_id text,
  add column if not exists fields_locked boolean not null default false,
  add column if not exists local_updated_at timestamptz;

create table if not exists public.drive_sync_state (
  id text primary key,
  root_folder_id text,
  last_sync_at timestamptz,
  last_error text,
  last_pulled int not null default 0,
  last_pushed int not null default 0,
  last_review int not null default 0
);

alter table public.drive_sync_state enable row level security;
