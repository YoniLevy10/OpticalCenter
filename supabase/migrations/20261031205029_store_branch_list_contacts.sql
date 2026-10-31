-- Store landline and mailbox from Ari's branch list.
-- These are not WhatsApp ids; store_phones stays the WA routing table.

alter table public.stores
  add column if not exists store_phone text,
  add column if not exists store_email text;

comment on column public.stores.store_phone is
  'Store landline from the branch list. Not a WhatsApp id.';

comment on column public.stores.store_email is
  'Store mailbox from the branch list.';
