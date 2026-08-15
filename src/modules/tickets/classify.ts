import type { TicketPriority } from '@/modules/tickets/constants'

export type FaultClassification = {
  category: string
  priority: TicketPriority
}

/**
 * Dumb keyword rules for Israel pilot (Hebrew + common English equipment terms).
 * Not an AI chatbot — just enough to tag HVAC/electrical/etc for HQ triage.
 */
export function classifyFaultText(text: string): FaultClassification {
  const t = text.trim().toLowerCase()

  if (
    /מזגן|מיזוג|מזגנים|קירור|חימום|hvac|air\s*cond|ac[\s-]/.test(t)
  ) {
    return { category: 'hvac', priority: 'high' }
  }
  if (/חשמל|קצר|נפילת\s*מתח|לוח\s*חשמל|תאורה|נורה|electric/.test(t)) {
    return { category: 'electrical', priority: 'high' }
  }
  if (/מים|נזילה|אינסטל|סתימה|שירותים|כיור|plumbing|leak/.test(t)) {
    return { category: 'plumbing', priority: 'high' }
  }
  if (/דלת|מנעול|כספת|אזעקה|אבטחה|security|lock/.test(t)) {
    return { category: 'security', priority: 'critical' }
  }
  if (/מחשב|קופה|מסוף|רשת|wifi|אינטרנט|מדפסת|pos|it\b/.test(t)) {
    return { category: 'it', priority: 'medium' }
  }
  if (/ניקיון|ריח|אשפה|cleaning/.test(t)) {
    return { category: 'cleaning', priority: 'low' }
  }

  return { category: 'other', priority: 'medium' }
}
