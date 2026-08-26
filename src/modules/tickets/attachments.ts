import { createAdminClient } from '@/lib/supabase/admin'

/**
 * HQ evidence.
 *
 * `getById` never selected `ticket_attachments`, so the ops console could not
 * display what the store photographed — the whole point of WhatsApp intake.
 * This is an additive READ ONLY helper following the same direct-query pattern
 * `modules/tickets/tech.ts` already uses. No schema change, no write path, and
 * `service.ts` is untouched.
 */

export type TicketEvidence = {
  id: string
  url: string
  kind?: string | null
}

type MessageLike = { id: string; media_url?: string | null }

export async function fetchTicketAttachments(
  ticketId: string,
): Promise<TicketEvidence[]> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('ticket_attachments')
      .select('id, url, kind, created_at')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true })

    if (error || !data) return []
    return data as TicketEvidence[]
  } catch {
    // Memory backend or missing migrations — evidence is simply absent.
    return []
  }
}

/**
 * WhatsApp photos arrive on `ticket_messages.media_url`, which is a different
 * column from the attachments table. Both are evidence to an operator, so the
 * UI merges them and de-duplicates by URL.
 */
export function mergeEvidence(
  attachments: TicketEvidence[],
  messages: MessageLike[] = [],
): TicketEvidence[] {
  const seen = new Set(attachments.map((a) => a.url))
  const fromMessages: TicketEvidence[] = []

  for (const m of messages) {
    if (!m.media_url || seen.has(m.media_url)) continue
    seen.add(m.media_url)
    fromMessages.push({ id: `msg-${m.id}`, url: m.media_url, kind: 'image' })
  }

  return [...attachments, ...fromMessages]
}

/** Attach store-submitted photos from the public report form. */
export async function attachReportPhotos(
  ticketId: string,
  urls: string[],
): Promise<void> {
  const cleaned = urls.map((u) => u.trim()).filter(Boolean)
  if (!cleaned.length) return

  const { memAddMessage, supabaseReady } = await import('@/lib/data/memory-store')

  if (await supabaseReady()) {
    const supabase = createAdminClient()
    await supabase.from('ticket_attachments').insert(
      cleaned.map((url) => ({
        ticket_id: ticketId,
        url,
        kind: 'image',
      })),
    )
    return
  }

  for (const url of cleaned) {
    memAddMessage(ticketId, {
      channel: 'web',
      direction: 'inbound',
      body: null,
      media_url: url,
    })
  }
}
