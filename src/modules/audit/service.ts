import {
  memListRecentEvents,
  supabaseReady,
  type MemAuditEvent,
} from '@/lib/data/memory-store'
import { createSystemClient } from '@/lib/supabase/system'

export async function listRecentAuditEvents(limit = 80): Promise<{
  events: MemAuditEvent[]
  backend: 'supabase' | 'memory'
}> {
  if (await supabaseReady()) {
    const supabase = createSystemClient('audit_list')
    const { data, error } = await supabase
      .from('ticket_events')
      .select(
        'id, ticket_id, event_type, actor_id, payload, created_at, tickets(display_number)',
      )
      .order('created_at', { ascending: false })
      .limit(limit)
    if (!error && data) {
      return {
        backend: 'supabase',
        events: data.map((e) => {
          const tickets = e.tickets as
            | { display_number?: string | null }
            | { display_number?: string | null }[]
            | null
          const display = Array.isArray(tickets)
            ? tickets[0]?.display_number
            : tickets?.display_number
          return {
            id: e.id as string,
            ticket_id: e.ticket_id as string,
            ticket_display: display ?? null,
            event_type: e.event_type as string,
            actor_id: (e.actor_id as string | null) ?? null,
            payload: (e.payload as Record<string, unknown>) ?? {},
            created_at: e.created_at as string,
          }
        }),
      }
    }
  }
  return { backend: 'memory', events: memListRecentEvents(limit) }
}
