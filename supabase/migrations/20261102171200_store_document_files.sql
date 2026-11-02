-- Certificate PDFs live in a private bucket. The row keeps the path, not a mail link.

alter table public.store_documents
  add column if not exists storage_path text;

alter table public.ingested_files
  add column if not exists storage_path text;

comment on column public.store_documents.storage_path is
  'Path of the certificate file in the private store-documents bucket. Not a mail link.';

comment on column public.ingested_files.storage_path is
  'Path of the source file in the private store-documents bucket.';

do $$
begin
  if to_regclass('storage.buckets') is null then
    raise notice 'storage.buckets missing — skip store-documents bucket';
    return;
  end if;

  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values (
    'store-documents',
    'store-documents',
    false,
    10485760,
    array['application/pdf', 'application/msword', 'application/octet-stream']
  )
  on conflict (id) do update
  set
    public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;
end $$;
