-- Phase 5: first_response_at for SLA display + ticket-media storage bucket

alter table public.tickets
  add column if not exists first_response_at timestamptz;

comment on column public.tickets.first_response_at is
  'When the store first received a human response (assign / in_progress).';

-- Public bucket for inbound WhatsApp / tech evidence (service-role uploads).
-- Guarded: storage schema exists on hosted Supabase; skip if absent.
do $$
begin
  if to_regclass('storage.buckets') is null then
    raise notice 'storage.buckets missing — skip ticket-media bucket';
    return;
  end if;

  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values (
    'ticket-media',
    'ticket-media',
    true,
    10485760,
    array[
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'application/pdf',
      'application/octet-stream'
    ]
  )
  on conflict (id) do update
  set
    public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

  execute 'drop policy if exists ticket_media_public_read on storage.objects';
  execute $p$
    create policy ticket_media_public_read on storage.objects
      for select
      using (bucket_id = 'ticket-media')
  $p$;
end $$;
