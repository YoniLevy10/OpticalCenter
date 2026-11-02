import { plainOpenForHe, plainStatus } from '@/components/ops/plain-labels'
import { ticketDecision } from '@/modules/decisions/queue'
import {
  normalizeTicketCategory,
  TICKET_CATEGORY_LABELS_HE,
} from '@/modules/tickets/constants'
import { isBreached, type QueueTicket } from '@/modules/tickets/queue'
import { ticketIsUrgent } from '@/modules/tickets/urgent'
import {
  findRecurrences,
  suggestPrevention,
  type HistoryTicket,
} from '@/modules/tickets/recurrence'
import type { Locale } from '@/lib/i18n/locale'
import { phrase } from '@/lib/i18n/phrases'
import { isNightHour, jerusalemHour } from '@/lib/theme'

/** Stores past this stay under "עוד סניפים" so the home is not a wall. */
export const ARI_HOME_STORE_CAP = 8

/** Day greeting until 19:00 Israel time; night greeting from 19:00 until 07:00. */
export function ariGreeting(now = new Date()): 'בוקר טוב ארי' | 'לילה טוב ארי' {
  return isNightHour(jerusalemHour(now)) ? 'לילה טוב ארי' : 'בוקר טוב ארי'
}

const JERUSALEM_DAY = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Jerusalem',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

export type AriHomeRow = {
  id: string
  href: string
  problem: string
  status: string
  openFor: string
  overdue: boolean
}

export type AriHomeCategory = {
  key: string
  label: string
  rows: AriHomeRow[]
  advice: string
  prevention: string | null
  urgent: boolean
  actionLabel: string
  actionHref: string
}

export type AriHomeStore = {
  id: string
  name: string
  code: string
  categories: AriHomeCategory[]
}

export type AriHomeModel = {
  open: number
  closedToday: number
  stores: AriHomeStore[]
  moreStores: number
}

const PRIORITY_RANK: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
}

function jerusalemDay(iso: string): string | null {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  return JERUSALEM_DAY.format(date)
}

export function countClosedToday(
  tickets: QueueTicket[],
  now = new Date(),
): number {
  const today = JERUSALEM_DAY.format(now)
  let count = 0
  for (const ticket of tickets) {
    if (ticket.status !== 'resolved' && ticket.status !== 'closed') continue
    if (!ticket.resolved_at) continue
    if (jerusalemDay(ticket.resolved_at) === today) count += 1
  }
  return count
}

function severity(ticket: QueueTicket, now: Date): number {
  const waiting =
    ticketIsUrgent(ticket) && ticket.status !== 'engaged' ? 0 : 30
  const overdue = isBreached(ticket, now) ? 0 : 10
  const priority = PRIORITY_RANK[ticket.priority] ?? 2
  return waiting + overdue + priority
}

function actionVerb(ticket: QueueTicket, now: Date, locale: Locale): string {
  const decision = ticketDecision(ticket, now, locale)
  if (!decision) return phrase(locale, 'לטפל')
  return decision.action.split('·')[0]?.trim() || phrase(locale, 'לטפל')
}

function toHistory(ticket: QueueTicket): HistoryTicket {
  return {
    id: ticket.id,
    storeId: ticket.store_id || ticket.stores?.code || '',
    category: normalizeTicketCategory(ticket.category || 'other'),
    description: ticket.description,
    status: ticket.status,
    createdAt: ticket.created_at,
  }
}

export function buildAriHome(input: {
  openTickets: QueueTicket[]
  closedTickets: QueueTicket[]
  openCount: number
  now?: Date
  locale?: Locale
}): AriHomeModel {
  const now = input.now ?? new Date()
  const locale = input.locale ?? 'he'
  const history = [...input.openTickets, ...input.closedTickets].map(toHistory)
  const byStore = new Map<string, QueueTicket[]>()

  for (const ticket of input.openTickets) {
    const key = ticket.store_id || ticket.stores?.code || ticket.id
    const list = byStore.get(key) ?? []
    list.push(ticket)
    byStore.set(key, list)
  }

  const ranked = [...byStore.entries()].map(([id, tickets]) => {
    const sample = tickets[0]
    const byCategory = new Map<string, QueueTicket[]>()
    for (const ticket of tickets) {
      const key = normalizeTicketCategory(ticket.category || 'other')
      const list = byCategory.get(key) ?? []
      list.push(ticket)
      byCategory.set(key, list)
    }

    const categories = [...byCategory.entries()].map(([key, group]) => {
      const ordered = [...group].sort((a, b) => {
        const rank = severity(a, now) - severity(b, now)
        if (rank !== 0) return rank
        return (
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )
      })
      const lead = ordered[0]
      const heLabel = TICKET_CATEGORY_LABELS_HE[key] ?? key
      const label = phrase(locale, heLabel)
      const verb = actionVerb(lead, now, locale)
      const preventionRaw = suggestPrevention(
        findRecurrences(toHistory(lead), history, 180, now),
      )
      const urgent = ordered.some(
        (ticket) => ticketIsUrgent(ticket) && ticket.status !== 'engaged',
      )
      const category: AriHomeCategory = {
        key,
        label,
        rows: ordered.map((ticket) => {
          const openFor = plainOpenForHe(
            ticket.created_at,
            ticket,
            now,
            locale,
          )
          return {
            id: ticket.id,
            href: `/ops/tickets/${ticket.id}`,
            problem: (
              ticket.title ||
              ticket.description ||
              phrase(locale, 'ללא תיאור')
            ).trim(),
            status: plainStatus(ticket.status, locale),
            openFor: openFor.text,
            overdue: openFor.overdue,
          }
        }),
        advice: `${verb} · ${label}`,
        prevention: preventionRaw ? phrase(locale, preventionRaw) : null,
        urgent,
        actionLabel: verb,
        actionHref: `/ops/tickets/${lead.id}`,
      }
      return { rank: severity(lead, now), category }
    })

    categories.sort((a, b) => a.rank - b.rank)
    const worst = categories.reduce(
      (min, item) => Math.min(min, item.rank),
      99,
    )
    const store: AriHomeStore = {
      id,
      name: sample.stores?.name?.trim() || phrase(locale, 'סניף'),
      code: sample.stores?.code?.trim() || '',
      categories: categories.map((item) => item.category),
    }
    return { rank: worst, store }
  })

  ranked.sort((a, b) => {
    if (a.rank !== b.rank) return a.rank - b.rank
    return a.store.name.localeCompare(b.store.name, 'he')
  })

  return {
    open: input.openCount,
    closedToday: countClosedToday(input.closedTickets, now),
    stores: ranked.slice(0, ARI_HOME_STORE_CAP).map((item) => item.store),
    moreStores: Math.max(0, ranked.length - ARI_HOME_STORE_CAP),
  }
}
