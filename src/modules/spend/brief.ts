import { parseBundleScope } from '@/modules/recommendations/commit'
import { formatIls } from '@/modules/spend/true-cost'
import type { SpendRequest } from '@/modules/spend/policy'

export type ApprovalBrief = {
  what: string
  who: string
  whom: string
}

function personName(requestedBy: string | null): string {
  const name = requestedBy?.split('·')[0]?.trim()
  return name || 'מנהל הסניף'
}

/** Three lines for Ari: the fault, who asked, and who would do the work. */
export function approvalBrief(
  spend: SpendRequest,
  fault: string | null,
): ApprovalBrief {
  const bundle = parseBundleScope(spend.scope)
  const amount = formatIls(spend.requestedAmount)
  const place = spend.storeName || spend.storeCode
  const job = fault?.trim() || spend.reason.trim() || 'הזמנת בעל מקצוע'
  const what = bundle
    ? `ביקור אחד ל־${bundle.ticketIds.length} תקלות בסניף ${place}. ${job}`
    : `${job} בסניף ${place}.`
  const who = `מטעם ${personName(spend.requestedBy)}.`
  const whom = spend.vendorName?.trim()
    ? `${spend.vendorName.trim()}, ${amount}.`
    : `עדיין בלי ספק, ${amount}.`
  return { what, who, whom }
}
