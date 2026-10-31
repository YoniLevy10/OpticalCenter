import { listSpends } from '@/lib/data/ops-ledger'
import type { BundleCard } from '@/modules/whatsapp/agent/bundle'
import type { BundleRequest } from './commit'
import { findPendingBundle, parseBundleScope } from './commit'

export type RecommendationCardModel = {
  id: string
  storeName: string
  storeId: string
  sentence: string
  costLine: string
  personLine: string | null
  actionLabel: string
  href: string | null
  spendId: string | null
  request: BundleRequest | null
}

function averageFrom(line: string | null): number | null {
  if (!line || line === 'אין עדיין מחיר' || line.includes('–') || line.includes('טווח')) return null
  const match = line.match(/₪\s*(\d+)/)
  if (!match?.[1]) return null
  const amount = Number(match[1])
  return Number.isFinite(amount) && amount > 0 ? amount : null
}

export function presentRecommendations(
  cards: BundleCard[],
  storeCodes: Record<string, string>,
): RecommendationCardModel[] {
  return cards.map((card) => {
    const pending = findPendingBundle(card.ticketIds)
    const storeCode = storeCodes[card.storeId] || ''
    const missing = card.kind === 'bundle' && !card.professionalName
    const href =
      card.kind === 'urgent'
        ? `/ops/tickets/${card.ticketIds[0]}`
        : card.kind === 'prevention'
          ? `/ops/tickets?store=${encodeURIComponent(storeCode)}`
          : missing
            ? '/ops/professionals'
            : null
    const actionLabel =
      card.kind === 'urgent'
        ? 'לטפל עכשיו'
        : card.kind === 'prevention'
          ? 'לבדיקה'
          : missing
            ? 'להוסיף איש מקצוע'
            : 'לאשר הזמנה'
    const personLine = card.professionalName
      ? card.professionalSource === 'outcome'
        ? `היה כאן · ${card.professionalName}`
        : `מהפנקס · ${card.professionalName}`
      : null
    return {
      id: card.id,
      storeName: card.storeName,
      storeId: card.storeId,
      sentence: card.sentence,
      costLine: card.costLine || '',
      personLine,
      actionLabel,
      href,
      spendId: pending?.id ?? null,
      request:
        card.kind === 'bundle' && card.professionalName
          ? {
              storeId: card.storeId,
              storeCode,
              storeName: card.storeName,
              sentence: card.sentence,
              vendorId: card.professionalSource === 'outcome' ? card.professionalId : null,
              vendorName: card.professionalName,
              ticketIds: card.ticketIds,
              averageAmount: averageFrom(card.costLine),
            }
          : null,
    }
  })
}

export function bundleSpendsPending() {
  return listSpends().filter(
    (spend) => spend.status === 'pending' && parseBundleScope(spend.scope),
  )
}
