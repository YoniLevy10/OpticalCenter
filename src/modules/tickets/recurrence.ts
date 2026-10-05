export type HistoryTicket = {
  id: string
  storeId: string
  category: string
  assetId?: string | null
  description: string
  status: string
  createdAt: string
  resolutionNote?: string | null
}

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
    .filter((ticket) => {
      if (current.assetId && ticket.assetId && ticket.assetId !== current.assetId) {
        return false
      }
      return new Date(ticket.createdAt).getTime() >= from
    })
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
