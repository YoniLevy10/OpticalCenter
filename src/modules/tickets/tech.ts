import { createAdminClient } from '@/lib/supabase/admin'
import type { TicketPriority, TicketStatus } from '@/modules/tickets/constants'

export const TECH_LIST_STATUSES: TicketStatus[] = [
  'assigned',
  'in_progress',
  'waiting_parts',
  'resolved',
]

export type TechTab = 'new_assigned' | 'in_progress' | 'done'

export const TECH_TAB_STATUSES: Record<TechTab, TicketStatus[]> = {
  new_assigned: ['assigned'],
  in_progress: ['in_progress', 'waiting_parts'],
  done: ['resolved'],
}

export const TECH_TAB_LABELS_HE: Record<TechTab, string> = {
  new_assigned: 'חדש/משויך',
  in_progress: 'בטיפול',
  done: 'הושלם',
}

const TECH_TRANSITIONS: Partial<Record<TicketStatus, TicketStatus[]>> = {
  assigned: ['in_progress'],
  in_progress: ['waiting_parts', 'resolved'],
  waiting_parts: ['in_progress', 'resolved'],
}

export type TechTicketRow = {
  id: string
  number: number | null
  display_number: string | null
  status: TicketStatus | string
  priority: TicketPriority | string
  category: string
  description: string
  title: string | null
  assigned_to: string | null
  created_at: string
  updated_at: string
  store_id: string
  stores?: { code: string; name: string; city: string | null; address: string | null } | null
}

export type TechTicketDetail = TechTicketRow & {
  events?: {
    id: string
    event_type: string
    payload: Record<string, unknown>
    created_at: string
    actor_id: string | null
  }[]
  attachments?: { id: string; url: string; kind: string; created_at: string }[]
}

export function resolveTechId(queryTechId?: string | null): string | null {
  const fromQuery = queryTechId?.trim()
  if (fromQuery && isUuid(fromQuery)) return fromQuery
  const fromEnv = process.env.DEMO_TECH_ID?.trim()
  if (fromEnv && isUuid(fromEnv)) return fromEnv
  return fromQuery || fromEnv || null
}

export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  )
}

export function snippet(text: string, max = 90): string {
  const cleaned = text.replace(/\s+/g, ' ').trim()
  if (cleaned.length <= max) return cleaned
  return `${cleaned.slice(0, max - 1)}…`
}

export async function fetchTechTickets(techId: string | null): Promise<{
  tickets: TechTicketRow[]
  fromDb: boolean
  error?: string
}> {
  try {
    const supabase = createAdminClient()
    let query = supabase
      .from('tickets')
      .select(
        'id, number, display_number, status, priority, category, description, title, assigned_to, created_at, updated_at, store_id, stores(code, name, city, address)',
      )
      .in('status', TECH_LIST_STATUSES)
      .order('updated_at', { ascending: false })
      .limit(100)

    if (techId) {
      query = query.or(`assigned_to.eq.${techId},and(assigned_to.is.null,status.eq.assigned)`)
    }

    const { data, error } = await query
    if (error) return { tickets: [], fromDb: false, error: error.message }
    return { tickets: (data as unknown as TechTicketRow[]) ?? [], fromDb: true }
  } catch (e) {
    return {
      tickets: [],
      fromDb: false,
      error: e instanceof Error ? e.message : 'db_unavailable',
    }
  }
}

export async function fetchTechTicket(ticketId: string): Promise<{
  ticket: TechTicketDetail | null
  fromDb: boolean
  error?: string
}> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('tickets')
      .select(
        `id, number, display_number, status, priority, category, description, title, assigned_to, created_at, updated_at, store_id,
         stores(code, name, city, address),
         ticket_events(id, event_type, payload, created_at, actor_id),
         ticket_attachments(id, url, kind, created_at)`,
      )
      .eq('id', ticketId)
      .maybeSingle()

    if (error) return { ticket: null, fromDb: false, error: error.message }
    if (!data) return { ticket: null, fromDb: true }

    const row = data as unknown as TechTicketDetail & {
      ticket_events?: TechTicketDetail['events']
      ticket_attachments?: TechTicketDetail['attachments']
    }

    const events = [...(row.ticket_events ?? [])].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )

    return {
      ticket: { ...row, events, attachments: row.ticket_attachments ?? [] },
      fromDb: true,
    }
  } catch (e) {
    return {
      ticket: null,
      fromDb: false,
      error: e instanceof Error ? e.message : 'db_unavailable',
    }
  }
}

export function filterTicketsByTab(tickets: TechTicketRow[], tab: TechTab): TechTicketRow[] {
  const statuses = new Set(TECH_TAB_STATUSES[tab])
  return tickets.filter((t) => statuses.has(t.status as TicketStatus))
}

export function nextStatusActions(current: string): TicketStatus[] {
  return [...(TECH_TRANSITIONS[current as TicketStatus] ?? [])]
}

export function canTechTransition(from: string, to: string): boolean {
  return (TECH_TRANSITIONS[from as TicketStatus] ?? []).includes(to as TicketStatus)
}
