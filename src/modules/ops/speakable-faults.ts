import { TICKET_CATEGORY_LABELS_HE } from '@/modules/tickets/constants'

export type SpeakableFault = {
  urgent: boolean
  storeName: string
  category: string
}

/** Short Hebrew a phone can read aloud. Not a voice note. */
export function speakableFaultSummary(faults: SpeakableFault[]): string {
  if (faults.length === 0) return 'אין תקלות פתוחות.'
  const urgent = faults.filter((fault) => fault.urgent)
  const rest = faults.length - urgent.length
  const first = urgent[0]
  const label = first
    ? (TICKET_CATEGORY_LABELS_HE[first.category] ?? first.category)
    : ''
  const head = first
    ? `${urgent.length} דחופות. ${first.storeName} ${label}.`
    : 'אין דחופות.'
  const tail = rest > 0 ? ` ${rest} לא דחופות.` : ''
  return `${head}${tail}`.replace(/\s+/g, ' ').trim()
}
