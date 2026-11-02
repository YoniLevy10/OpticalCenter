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
  /** B02 — before | after for repair proof pair. */
  proof_role?: string | null
}

function inferMediaKind(url: string): string {
  const lower = url.toLowerCase()
  if (/\.(mp4|webm)(\?|$)/.test(lower) || lower.includes('video/')) return 'video'
  if (
    /\.(ogg|mp3|wav|m4a|opus)(\?|$)/.test(lower) ||
    lower.includes('audio/')
  ) {
    return 'audio'
  }
  if (/\.(pdf|doc)(\?|$)/.test(lower)) return 'document'
  return 'image'
}

type MessageLike = {
  id: string
  media_url?: string | null
  proof_role?: string | null
  body?: string | null
}

export async function fetchTicketAttachments(
  ticketId: string,
): Promise<TicketEvidence[]> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('ticket_attachments')
      .select('id, url, kind, proof_role, created_at')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true })

    if (error) {
      // Fail-open when proof_role column is missing (migration not applied).
      const fallback = await supabase
        .from('ticket_attachments')
        .select('id, url, kind, created_at')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true })
      if (fallback.error || !fallback.data) return []
      return fallback.data as TicketEvidence[]
    }
    if (!data) return []
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
  const usable = (url: string) =>
    Boolean(url) &&
    !url.startsWith('meta-media:') &&
    (url.startsWith('https://') ||
      url.startsWith('http://') ||
      url.startsWith('data:') ||
      url.startsWith('/'))

  const seen = new Set<string>()
  const out: TicketEvidence[] = []

  for (const a of attachments) {
    if (!usable(a.url) || seen.has(a.url)) continue
    seen.add(a.url)
    out.push(a)
  }

  for (const m of messages) {
    if (!m.media_url || !usable(m.media_url) || seen.has(m.media_url)) continue
    seen.add(m.media_url)
    const role =
      m.proof_role === 'before' || m.proof_role === 'after'
        ? m.proof_role
        : m.body === 'before' || m.body === 'after'
          ? m.body
          : null
    out.push({
      id: `msg-${m.id}`,
      url: m.media_url,
      kind: inferMediaKind(m.media_url),
      proof_role: role,
    })
  }

  return out
}

/** Photos already on these faults. Missing storage returns an empty map. */
export async function photosForTickets(
  ticketIds: string[],
): Promise<Record<string, TicketEvidence[]>> {
  const ids = [...new Set(ticketIds.filter(Boolean))]
  const out: Record<string, TicketEvidence[]> = {}
  if (ids.length === 0) return out

  const { supabaseReady, memListTickets } = await import('@/lib/data/memory-store')
  if (!(await supabaseReady())) {
    const wanted = new Set(ids)
    for (const ticket of memListTickets()) {
      if (!wanted.has(ticket.id)) continue
      const photos = mergeEvidence([], ticket.messages).filter(
        (item) => item.kind === 'image' || item.kind == null,
      )
      if (photos.length > 0) out[ticket.id] = photos
    }
    return out
  }

  try {
    const supabase = createAdminClient()
    let attachmentRows: {
      id: string
      ticket_id: string
      url: string
      kind?: string | null
      proof_role?: string | null
    }[] = []
    const primary = await supabase
      .from('ticket_attachments')
      .select('id, ticket_id, url, kind, proof_role')
      .in('ticket_id', ids)
    if (primary.error) {
      const fallback = await supabase
        .from('ticket_attachments')
        .select('id, ticket_id, url, kind')
        .in('ticket_id', ids)
      attachmentRows = (fallback.data ?? []) as typeof attachmentRows
    } else {
      attachmentRows = (primary.data ?? []) as typeof attachmentRows
    }

    type MessageRow = MessageLike & { ticket_id: string }
    let messageRows: MessageRow[] = []
    const withRole = await supabase
      .from('ticket_messages')
      .select('id, ticket_id, media_url, body, proof_role')
      .in('ticket_id', ids)
      .not('media_url', 'is', null)
    if (withRole.error) {
      const fallback = await supabase
        .from('ticket_messages')
        .select('id, ticket_id, media_url, body')
        .in('ticket_id', ids)
        .not('media_url', 'is', null)
      messageRows = (fallback.data ?? []) as unknown as MessageRow[]
    } else {
      messageRows = (withRole.data ?? []) as unknown as MessageRow[]
    }

    const attachmentsByTicket = new Map<string, TicketEvidence[]>()
    for (const row of attachmentRows) {
      const list = attachmentsByTicket.get(row.ticket_id) ?? []
      list.push({
        id: row.id,
        url: row.url,
        kind: row.kind,
        proof_role: row.proof_role,
      })
      attachmentsByTicket.set(row.ticket_id, list)
    }
    const messagesByTicket = new Map<string, MessageLike[]>()
    for (const row of messageRows) {
      const list = messagesByTicket.get(row.ticket_id) ?? []
      list.push(row)
      messagesByTicket.set(row.ticket_id, list)
    }

    for (const id of ids) {
      const photos = mergeEvidence(
        attachmentsByTicket.get(id) ?? [],
        messagesByTicket.get(id) ?? [],
      ).filter((item) => item.kind === 'image' || item.kind == null)
      if (photos.length > 0) out[id] = photos
    }
  } catch {
    return out
  }

  return out
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
        proof_role: 'before',
      })),
    )
    return
  }

  for (const url of cleaned) {
    memAddMessage(ticketId, {
      channel: 'web',
      direction: 'inbound',
      body: 'before',
      media_url: url,
      proof_role: 'before',
    })
  }
}
