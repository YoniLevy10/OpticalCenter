-- Stash inbound WhatsApp media until a ticket exists (Bamakor-style).
-- Photos often arrive before store identity / clarification is done.

alter table public.intake_sessions
  add column if not exists pending_media_url text,
  add column if not exists pending_media_kind text;

comment on column public.intake_sessions.pending_media_url is
  'Inbound Meta media stub (meta-media:{id}) or https URL held until ticket create';
comment on column public.intake_sessions.pending_media_kind is
  'image | video | document — kind for pending_media_url';

-- Persist media id on conversation log for later recovery / ops diagnostics.
alter table public.whatsapp_messages
  add column if not exists media_ref text;

comment on column public.whatsapp_messages.media_ref is
  'Meta media id stub (meta-media:{id}) or direct media URL for inbound messages';

-- Allow WhatsApp video uploads into ticket-media (images/pdf already allowed).
do $$
begin
  if to_regclass('storage.buckets') is null then
    raise notice 'storage.buckets missing — skip ticket-media mime update';
    return;
  end if;

  update storage.buckets
  set allowed_mime_types = array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'video/mp4',
    'video/quicktime',
    'video/webm',
    'application/pdf',
    'application/octet-stream'
  ]
  where id = 'ticket-media';
end $$;
