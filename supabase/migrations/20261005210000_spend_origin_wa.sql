-- Remember which WhatsApp chat asked, so Ari's answer can return to that store.
alter table public.spend_requests
  add column if not exists origin_wa_id text;

alter table public.store_documents
  add column if not exists origin_wa_id text;
