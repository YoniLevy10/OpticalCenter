-- Name Ari types on a store document. Null keeps the file name / type label.
alter table public.store_documents
  add column if not exists title text;

comment on column public.store_documents.title is
  'Hand-set display name. Empty means the file name or document type is shown.';
