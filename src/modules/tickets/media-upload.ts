import { createAdminClient } from '@/lib/supabase/admin'
import { memAddMessage, supabaseReady } from '@/lib/data/memory-store'
import type { MediaKind } from '@/modules/tickets/media-limits'

const BUCKET = 'ticket-media'

/** Persist one attachment URL on a ticket (Supabase or memory). */
export async function persistTicketAttachment(
  ticketId: string,
  url: string,
  kind: MediaKind | 'document',
): Promise<void> {
  if (await supabaseReady()) {
    const supabase = createAdminClient()
    await supabase.from('ticket_attachments').insert({
      ticket_id: ticketId,
      url,
      kind,
    })
    return
  }
  memAddMessage(ticketId, {
    channel: 'web',
    direction: 'inbound',
    body: null,
    media_url: url,
  })
}

/** Upload bytes to Supabase Storage; returns public/signed URL or data URL fallback. */
export async function uploadTicketMediaBytes(
  ticketId: string,
  bytes: Buffer,
  mime: string,
  kind: MediaKind,
): Promise<string> {
  if (await supabaseReady()) {
    try {
      const supabase = createAdminClient()
      const ext = kind === 'video' ? (mime.includes('webm') ? 'webm' : 'mp4') : 'jpg'
      const path = `${ticketId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error } = await supabase.storage.from(BUCKET).upload(path, bytes, {
        contentType: mime,
        upsert: true,
      })
      if (!error) {
        const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
        if (data.publicUrl) return data.publicUrl
      }
    } catch {
      /* fall through */
    }
  }
  const b64 = bytes.toString('base64')
  return `data:${mime};base64,${b64}`
}

export async function uploadTicketMediaFile(
  ticketId: string,
  file: File,
  kind: MediaKind,
): Promise<string> {
  const buf = Buffer.from(await file.arrayBuffer())
  return uploadTicketMediaBytes(ticketId, buf, file.type, kind)
}
