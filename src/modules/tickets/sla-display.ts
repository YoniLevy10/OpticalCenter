import type { TicketPriority } from '@/modules/tickets/constants'
import { SLA_WINDOWS, getSlaBreachKind } from '@/modules/tickets/sla'
import type { Locale } from '@/lib/i18n/locale'
import { phrase } from '@/lib/i18n/phrases'

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
  locale?: Locale
}

const MIN = 60_000
const HOUR = 60 * MIN

/** Under this share of the window remaining, the countdown turns amber. */
export const SLA_WARNING_THRESHOLD = 0.2

function hasResponded(status: string, firstResponseAt?: string | null): boolean {
  if (firstResponseAt) return true
  return (
    status === 'in_progress' ||
    status === 'waiting_vendor' ||
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
  try {
    return new Intl.DateTimeFormat('he-IL', {
      timeZone: 'Asia/Jerusalem',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).format(d)
  } catch {
    return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`
  }
}

/**
 * The queue's most important cell. Returns a live remaining-time view rather
 * than the static policy string the old `formatSlaLabelHe` produced.
 */
export function getSlaView(input: SlaInput): SlaView {
  const now = input.now ?? new Date()
  const status = input.status ?? ''
  const locale = input.locale ?? 'he'

  if (status === 'resolved' || status === 'closed' || status === 'cancelled') {
    return {
      tone: 'done',
      short: '—',
      long: phrase(locale, status === 'cancelled' ? 'בוטל' : 'הושלם בזמן היעד'),
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
      long: phrase(locale, 'אין יעד SLA'),
      phase: 'none',
      dueAt: null,
      remainingMs: null,
    }
  }

  const remainingMs = new Date(dueAt).getTime() - now.getTime()
  const phaseLabel = phrase(locale, phase === 'respond' ? 'תגובה' : 'סיום')

  if (breach !== 'none' || remainingMs <= 0) {
    const overdue =
      locale === 'he'
        ? formatDurationHe(Math.abs(remainingMs))
        : formatDuration(Math.abs(remainingMs), locale)
    return {
      tone: 'critical',
      short:
        locale === 'he' ? `באיחור ${overdue}` : `${phrase(locale, 'באיחור')} ${overdue}`,
      long:
        locale === 'he'
          ? `חריגת SLA ${phase === 'respond' ? 'תגובה' : 'סיום'} · ${overdue}`
          : `${phrase(locale, 'חריגת SLA')} ${phaseLabel} · ${overdue}`,
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
    short: locale === 'he' ? formatDurationHe(remainingMs) : formatDuration(remainingMs, locale),
    long:
      locale === 'he'
        ? `${phase === 'respond' ? 'תגובה' : 'סיום'} עד ${clockHe(dueAt)}`
        : `${phaseLabel} ${phrase(locale, 'עד')} ${clock(dueAt, locale)}`,
    phase,
    dueAt,
    remainingMs,
  }
}

/** Relative age of a ticket, e.g. "לפני 3ש׳". */
export function formatAgeHe(
  createdAt: string,
  now = new Date(),
  locale: Locale = 'he',
): string {
  const started = new Date(createdAt).getTime()
  if (Number.isNaN(started)) return '—'
  const diff = now.getTime() - started
  if (!Number.isFinite(diff)) return '—'
  // Small clock skew (future) → treat as now; larger skew → absolute-ish dash
  if (diff < 0) {
    if (diff > -2 * MIN) return phrase(locale, 'עכשיו')
    return '—'
  }
  if (diff < MIN) return phrase(locale, 'עכשיו')
  if (locale === 'he') return `לפני ${formatDurationHe(diff)}`
  const compact = formatDuration(diff, locale)
  return locale === 'fr' ? `il y a ${compact}` : `${compact} ago`
}

function formatDuration(ms: number, locale: Locale): string {
  const total = Math.max(0, Math.round(ms / MIN))
  const min = locale === 'fr' ? 'min' : 'm'
  const hour = locale === 'fr' ? 'h' : 'h'
  const day = locale === 'fr' ? 'j' : 'd'
  if (total < 60) return `${total}${min}`
  const hours = Math.floor(total / 60)
  const minutes = total % 60
  if (hours < 24) {
    return minutes === 0 ? `${hours}${hour}` : `${hours}${hour} ${minutes}${min}`
  }
  const days = Math.floor(hours / 24)
  const restHours = hours % 24
  return restHours === 0 ? `${days}${day}` : `${days}${day} ${restHours}${hour}`
}

function clock(iso: string, locale: Locale): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  const loc = locale === 'fr' ? 'fr-FR' : 'en-GB'
  try {
    return new Intl.DateTimeFormat(loc, {
      timeZone: 'Asia/Jerusalem',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).format(d)
  } catch {
    return clockHe(iso)
  }
}

/** Absolute datetime in Israel for ops surfaces. */
export function formatDateTimeHe(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  try {
    return new Intl.DateTimeFormat('he-IL', {
      timeZone: 'Asia/Jerusalem',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).format(d)
  } catch {
    return '—'
  }
}
