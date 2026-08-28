import { OPEN_TICKET_STATUSES } from '@/modules/tickets/constants'
import { memListTickets } from '@/lib/data/memory-store'
import type { SupabaseClient } from '@supabase/supabase-js'

export type DuplicateHit = {
  ticketId: string
  displayNumber: string | null
  description: string
  category: string | null
}

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^\u0590-\u05FFa-z0-9\s]/gi, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 3),
  )
}

function overlapScore(a: string, b: string): number {
  const ta = tokenize(a)
  const tb = tokenize(b)
  if (ta.size === 0 || tb.size === 0) return 0
  let hit = 0
  for (const w of ta) if (tb.has(w)) hit += 1
  return hit / Math.min(ta.size, tb.size)
}

/**
 * Heuristic duplicate detection: open tickets on same store with similar text.
 */
export async function findPossibleDuplicateTicket(params: {
  supabase: SupabaseClient | null
  storeId: string
  summary: string
  category: string
}): Promise<DuplicateHit | null> {
  const { storeId, summary, category, supabase } = params
  const normalizedCategory =
    category === 'electrical_hazard' ? 'electrical' : category

  if (!supabase) {
    const open = memListTickets().filter(
      (t) =>
        t.store_id === storeId &&
        OPEN_TICKET_STATUSES.includes(t.status as (typeof OPEN_TICKET_STATUSES)[number]),
    )
    let best: DuplicateHit | null = null
    let bestScore = 0
    for (const t of open) {
      const text = `${t.title || ''} ${t.description || ''}`
      let score = overlapScore(summary, text)
      if (
        t.category === normalizedCategory ||
        t.category === category
      ) {
        score += 0.15
      }
      if (score >= 0.55 && score > bestScore) {
        bestScore = score
        best = {
          ticketId: t.id,
          displayNumber: t.display_number,
          description: t.description,
          category: t.category,
        }
      }
    }
    return best
  }

  const { data, error } = await supabase
    .from('tickets')
    .select('id, display_number, description, title, category, status')
    .eq('store_id', storeId)
    .in('status', [...OPEN_TICKET_STATUSES])
    .order('created_at', { ascending: false })
    .limit(20)

  if (error || !data?.length) return null

  let best: DuplicateHit | null = null
  let bestScore = 0
  for (const t of data) {
    const text = `${t.title || ''} ${t.description || ''}`
    let score = overlapScore(summary, text)
    if (t.category === normalizedCategory || t.category === category) {
      score += 0.15
    }
    if (score >= 0.55 && score > bestScore) {
      bestScore = score
      best = {
        ticketId: t.id,
        displayNumber: t.display_number,
        description: t.description,
        category: t.category,
      }
    }
  }
  return best
}
