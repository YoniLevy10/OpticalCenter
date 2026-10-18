import { createAdminClient } from '@/lib/supabase/admin'
import { memAddMessage, supabaseReady } from '@/lib/data/memory-store'
import type { MediaKind } from '@/modules/tickets/media-limits'
import type { ProofRole } from '@/modules/tickets/proof-gate'
import { isMissingColumnError, isSupabaseSchemaError } from '@/lib/supabase/schema-fallback'

const BUCKET = 'ticket-media'

/** Persist one attachment URL on a ticket (Supabase or memory). */
export async function persistTicketAttachment(
  ticketId: string,
  url: string,
  kind: MediaKind | 'document',
  proofRole?: ProofRole | null,
): Promise<void> {
  if (await supabaseReady()) {
    const supabase = createAdminClient()
    const row: Record<string, unknown> = {
      ticket_id: ticketId,
      url,
      kind,
    }
    if (proofRole) row.proof_role = proofRole
    const { error } = await supabase.from('ticket_attachments').insert(row)
    if (error && (isMissingColumnError(error) || isSupabaseSchemaError(error))) {
      // Fail-open without proof_role when migration not applied yet.
      const { proof_role: _drop, ...withoutRole } = row
      void _drop
      await supabase.from('ticket_attachments').insert(withoutRole)
      return
    }
    if (error) throw new Error(error.message)
    return
  }
  memAddMessage(ticketId, {
    channel: 'web',
    direction: 'inbound',
    body: proofRole ?? null,
    media_url: url,
    proof_role: proofRole ?? null,
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
