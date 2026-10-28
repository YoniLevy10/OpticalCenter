export type HistoryTicket = {
  id: string
  storeId: string
  category: string
  assetId?: string | null
  description: string
  status: string
  createdAt: string
  resolvedAt?: string | null
  resolutionNote?: string | null
}

/** A fix held when no later ticket opened on the same subject inside this window. */
export const FIX_HOLD_DAYS = 30

export type RecurrenceHit = {
  ticket: HistoryTicket
  reason: string
}

const DAY = 24 * 60 * 60 * 1000

/**
 * A repeat is the same store, same fault type, and the same asset when known,
 * inside a time window. Rules first — no guessed learning.
 */
export function findRecurrences(
  current: HistoryTicket,
  history: HistoryTicket[],
  windowDays = 180,
  now = new Date(current.createdAt),
): RecurrenceHit[] {
  const from = now.getTime() - windowDays * DAY
  return history
    .filter((ticket) => ticket.id !== current.id)
    .filter((ticket) => ticket.storeId === current.storeId)
    .filter((ticket) => ticket.category === current.category)
    .filter((ticket) => sameFaultSubject(current, ticket))
    .filter((ticket) => new Date(ticket.createdAt).getTime() >= from)
    .map((ticket) => ({
      ticket,
      reason: current.assetId
        ? 'אותו סניף, אותו סוג תקלה ואותו ציוד'
        : 'אותו סניף ואותו סוג תקלה',
    }))
}

export function recurrenceBasis(hits: RecurrenceHit[]): string {
  if (hits.length === 0) return ''
  const ids = hits.map((hit) => hit.ticket.id).join(', ')
  return `ההמלצה נשענת על ${hits.length} אירועים קודמים: ${ids}`
}

export function suggestPrevention(hits: RecurrenceHit[], threshold = 3): string | null {
  if (hits.length < threshold) return null
  return 'התקלה חזרה כמה פעמים. כדאי לקבוע בדיקה מונעת בסניף.'
}

/**
 * Same store and fault type. When the current ticket names an asset, the
 * earlier ticket must be that asset — a different machine in the store is not a repeat.
 * Without an asset, store + category is the whole match.
 */
function sameFaultSubject(current: HistoryTicket, ticket: HistoryTicket): boolean {
  if (ticket.storeId !== current.storeId || ticket.category !== current.category) return false
  if (current.assetId) return ticket.assetId === current.assetId
  return true
}

/** Any later job on the same asset. Without an asset, store + category. */
function sameFixSubject(current: HistoryTicket, ticket: HistoryTicket): boolean {
  if (current.assetId) return ticket.assetId === current.assetId
  return ticket.storeId === current.storeId && ticket.category === current.category
}

/**
 * The previous fix did not hold when this ticket opened within 30 days
 * of that fix. Returns the earlier ticket, or null.
 */
export function previousFixFailed(
  current: HistoryTicket,
  history: HistoryTicket[],
  holdDays = FIX_HOLD_DAYS,
): HistoryTicket | null {
  const opened = new Date(current.createdAt).getTime()
  if (!Number.isFinite(opened)) return null
  const priors = history
    .filter((ticket) => ticket.id !== current.id)
    .filter((ticket) => sameFixSubject(current, ticket))
    .filter((ticket) => ticket.status === 'resolved' || ticket.status === 'closed')
    .filter((ticket) => ticket.resolvedAt)
    .filter((ticket) => new Date(ticket.resolvedAt!).getTime() <= opened)
    .sort(
      (a, b) =>
        new Date(b.resolvedAt!).getTime() - new Date(a.resolvedAt!).getTime(),
    )
  const previous = priors[0]
  if (!previous?.resolvedAt) return null
  const gap = opened - new Date(previous.resolvedAt).getTime()
  if (gap < 0 || gap > holdDays * DAY) return null
  return previous
}

export type AssetRepeatStats = {
  /** Tickets on this asset that already had an earlier same-fault ticket in 180 days. */
  repeats: number
  /** A resolved fix on this asset was followed by another ticket within 30 days. */
  lastFixFailed: boolean
}

export function assetRepeatStats(
  assetId: string,
  tickets: HistoryTicket[],
  holdDays = FIX_HOLD_DAYS,
): AssetRepeatStats {
  const mine = tickets.filter((ticket) => ticket.assetId === assetId)
  let repeats = 0
  for (const ticket of mine) {
    const opened = new Date(ticket.createdAt).getTime()
    const earlier = mine.filter((other) => new Date(other.createdAt).getTime() < opened)
    if (findRecurrences(ticket, earlier).length > 0) repeats += 1
  }

  const resolved = mine
    .filter(
      (ticket) =>
        (ticket.status === 'resolved' || ticket.status === 'closed') && ticket.resolvedAt,
    )
    .sort(
      (a, b) =>
        new Date(b.resolvedAt!).getTime() - new Date(a.resolvedAt!).getTime(),
    )
  const last = resolved[0]
  let lastFixFailed = false
  if (last?.resolvedAt) {
    const resolvedAt = new Date(last.resolvedAt).getTime()
    const limit = resolvedAt + holdDays * DAY
    lastFixFailed = mine.some((ticket) => {
      if (ticket.id === last.id) return false
      const opened = new Date(ticket.createdAt).getTime()
      return opened > resolvedAt && opened <= limit
    })
  }
  return { repeats, lastFixFailed }
}
