import type { TicketPriority } from '@/modules/tickets/constants'

export type FaultClassification = {
  category: string
  priority: TicketPriority
}

/**
 * Conservative keyword rules for Israel pilot.
 * Prefer false-high over missing a genuine safety-critical fault.
 */
export function classifyFaultText(text: string): FaultClassification {
  const t = text.trim().toLowerCase()

  // P0 hazards — check first
  if (
    /עשן|שריפה|אש\b|להבה|ניצוצ|ניצוצות|smoke|fire|spark|sparks|flames?/.test(
      t,
    ) ||
    /ריח\s*שרוף|שרוף|burning\s*smell|electrical\s*smell|חוט\s*חשוף|exposed\s*wir/.test(
      t,
    ) ||
    /(מים|נזיל).{0,24}(חשמל|לוח|שקע|ארון)|(חשמל|לוח|שקע).{0,24}(מים|נזיל)|water\s+near\s+electr/i.test(
      t,
    )
  ) {
    return { category: 'electrical_hazard', priority: 'critical' }
  }

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
