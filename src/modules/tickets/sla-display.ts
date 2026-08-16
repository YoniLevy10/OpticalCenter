import type { TicketPriority } from '@/modules/tickets/constants'
import { SLA_WINDOWS, getSlaBreachKind } from '@/modules/tickets/sla'

/**
 * Presentation layer for SLA. Pure derivation — the business rules in `sla.ts`
 * (windows, timestamp computation, breach detection) are untouched and remain
 * the single source of truth. This module only decides what the operator SEES.
 */

export type SlaTone = 'idle' | 'neutral' | 'warning' | 'critical' | 'done'

export type SlaView = {
  tone: SlaTone
  /** Short scannable value for the queue column, e.g. "42m" / "באיחור 27ד׳". */
  short: string
  /** Long form for detail surfaces, e.g. "תגובה עד 14:30". */
  long: string
  /** Which clock is currently running. */
  phase: 'respond' | 'resolve' | 'none'
  dueAt: string | null
  remainingMs: number | null
}

type SlaInput = {
  priority?: TicketPriority | string | null
  sla_respond_by?: string | null
  sla_resolve_by?: string | null
  status?: string | null
  first_response_at?: string | null
  resolved_at?: string | null
  created_at?: string | null
  now?: Date
}

const MIN = 60_000
const HOUR = 60 * MIN

/** Under this share of the window remaining, the countdown turns amber. */
export const SLA_WARNING_THRESHOLD = 0.2

function hasResponded(status: string, firstResponseAt?: string | null): boolean {
  if (firstResponseAt) return true
  return (
    status === 'in_progress' ||
    status === 'waiting_parts' ||
    status === 'resolved' ||
    status === 'closed'
  )
}

/** Fall back to a derived deadline when the row predates SLA stamping. */
function derivedDueAt(
  createdAt: string | null | undefined,
  priority: string | null | undefined,
  hours: 'respondHours' | 'resolveHours',
): string | null {
  if (!createdAt) return null
  const window = SLA_WINDOWS[priority as TicketPriority]
  if (!window) return null
  const base = new Date(createdAt).getTime()
  if (Number.isNaN(base)) return null
  return new Date(base + window[hours] * HOUR).toISOString()
}

/** Which deadline is currently active: respond first, then resolve. */
export function activeSlaTarget(input: SlaInput): {
  phase: 'respond' | 'resolve' | 'none'
  dueAt: string | null
} {
  const status = input.status ?? ''
  if (status === 'closed' || status === 'cancelled' || status === 'resolved') {
    return { phase: 'none', dueAt: null }
  }

  if (!hasResponded(status, input.first_response_at)) {
    const dueAt =
      input.sla_respond_by ??
      derivedDueAt(input.created_at, input.priority, 'respondHours')
    if (dueAt) return { phase: 'respond', dueAt }
  }

  const dueAt =
    input.sla_resolve_by ??
    derivedDueAt(input.created_at, input.priority, 'resolveHours')
  if (dueAt) return { phase: 'resolve', dueAt }

  return { phase: 'none', dueAt: null }
}

/** Compact duration: "3ד׳", "42ד׳", "1:18", "2ימ׳ 4ש׳". */
export function formatDurationHe(ms: number): string {
  const total = Math.max(0, Math.round(ms / MIN))
  if (total < 60) return `${total}ד׳`
  const hours = Math.floor(total / 60)
  const minutes = total % 60
  if (hours < 24) {
    return minutes === 0 ? `${hours}ש׳` : `${hours}:${String(minutes).padStart(2, '0')}`
  }
  const days = Math.floor(hours / 24)
  const restHours = hours % 24
  return restHours === 0 ? `${days}ימ׳` : `${days}ימ׳ ${restHours}ש׳`
}

function clockHe(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/**
 * The queue's most important cell. Returns a live remaining-time view rather
 * than the static policy string the old `formatSlaLabelHe` produced.
 */
export function getSlaView(input: SlaInput): SlaView {
  const now = input.now ?? new Date()
  const status = input.status ?? ''

  if (status === 'resolved' || status === 'closed' || status === 'cancelled') {
    return {
      tone: 'done',
      short: '—',
      long: status === 'cancelled' ? 'בוטל' : 'הושלם בזמן היעד',
      phase: 'none',
      dueAt: null,
      remainingMs: null,
    }
  }

  const breach = getSlaBreachKind({
    sla_respond_by: input.sla_respond_by,
    sla_resolve_by: input.sla_resolve_by,
    status: input.status,
    first_response_at: input.first_response_at,
    resolved_at: input.resolved_at,
    now,
  })

  const { phase, dueAt } = activeSlaTarget({ ...input, now })

  if (!dueAt) {
    return {
      tone: 'idle',
      short: '—',
      long: 'אין יעד SLA',
      phase: 'none',
      dueAt: null,
      remainingMs: null,
    }
  }

  const remainingMs = new Date(dueAt).getTime() - now.getTime()
  const phaseLabel = phase === 'respond' ? 'תגובה' : 'סיום'

  if (breach !== 'none' || remainingMs <= 0) {
    const overdue = formatDurationHe(Math.abs(remainingMs))
    return {
      tone: 'critical',
      short: `באיחור ${overdue}`,
      long: `חריגת SLA ${phaseLabel} · ${overdue}`,
      phase,
      dueAt,
      remainingMs,
    }
  }

  const window = SLA_WINDOWS[input.priority as TicketPriority]
  const fullMs = window
    ? (phase === 'respond' ? window.respondHours : window.resolveHours) * HOUR
    : null
  const approaching =
    fullMs != null && remainingMs / fullMs <= SLA_WARNING_THRESHOLD

  return {
    tone: approaching ? 'warning' : 'neutral',
    short: formatDurationHe(remainingMs),
    long: `${phaseLabel} עד ${clockHe(dueAt)}`,
    phase,
    dueAt,
    remainingMs,
  }
}

/** Relative age of a ticket, e.g. "לפני 3ש׳". */
export function formatAgeHe(createdAt: string, now = new Date()): string {
  const started = new Date(createdAt).getTime()
  if (Number.isNaN(started)) return '—'
  const diff = now.getTime() - started
  if (diff < MIN) return 'עכשיו'
  return `לפני ${formatDurationHe(diff)}`
}
