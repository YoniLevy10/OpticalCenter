import {
  TICKET_EVENT_LABELS_HE,
  TICKET_STATUS_LABELS_HE,
  type TicketStatus,
} from '@/modules/tickets/constants'

/**
 * Messages and events are one chronology, not two boxes. This merges the
 * WhatsApp transcript and the audit trail into a single ordered timeline for
 * presentation. Pure — reads existing rows, writes nothing.
 */

export type ActivityKind = 'message_in' | 'message_out' | 'event' | 'note'

export type ActivityItem = {
  id: string
  kind: ActivityKind
  at: string
  /** Headline, e.g. "שינוי סטטוס" or "הודעה מהחנות". */
  label: string
  /** Free text body, when the item carries one. */
  body?: string | null
  /** Rendered as a status transition when present. */
  transition?: { from?: string | null; to?: string | null }
  mediaUrl?: string | null
}

type MessageRow = {
  id: string
  direction: string
  body?: string | null
  media_url?: string | null
  created_at: string
}

type EventRow = {
  id: string
  event_type: string
  created_at: string
  payload?: Record<string, unknown> | null
}

function statusLabel(value: unknown): string | null {
  if (typeof value !== 'string') return null
  return TICKET_STATUS_LABELS_HE[value as TicketStatus] ?? value
}

export function buildActivity(
  messages: MessageRow[] = [],
  events: EventRow[] = [],
): ActivityItem[] {
  const fromMessages: ActivityItem[] = messages.map((m) => ({
    id: `m-${m.id}`,
    kind: m.direction === 'inbound' ? 'message_in' : 'message_out',
    at: m.created_at,
    label: m.direction === 'inbound' ? 'הודעה מהחנות' : 'הודעה מהמערכת',
    body: m.body ?? null,
    mediaUrl: m.media_url ?? null,
  }))

  const fromEvents: ActivityItem[] = events.map((e) => {
    const payload = e.payload ?? {}
    const note = typeof payload.note === 'string' ? payload.note : null
    // Writers emit {from,to}; older/alt payloads use from_status/to_status.
    const to = statusLabel(payload.to ?? payload.to_status)
    const from = statusLabel(payload.from ?? payload.from_status)

    return {
      id: `e-${e.id}`,
      kind: note && e.event_type !== 'status_changed' ? 'note' : 'event',
      at: e.created_at,
      label: TICKET_EVENT_LABELS_HE[e.event_type] ?? e.event_type,
      body: note,
      transition: to ? { from, to } : undefined,
    }
  })

  return [...fromMessages, ...fromEvents].sort(
    (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime(),
  )
}

/** Newest-first, for mobile where the latest state matters most. */
export function buildActivityDesc(
  messages: MessageRow[] = [],
  events: EventRow[] = [],
): ActivityItem[] {
  return buildActivity(messages, events).reverse()
}
