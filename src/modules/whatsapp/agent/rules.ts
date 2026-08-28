import type { TicketPriority } from '@/modules/tickets/constants'
import { classifyFaultText } from '@/modules/tickets/classify'
import type { IntakeAgentOutput } from './schema'

export type AppliedRule = {
  id: string
  reason: string
  priority?: TicketPriority
  category?: string
}

export type RulesResult = {
  category: string
  priority: TicketPriority
  applied: AppliedRule[]
  /** Final decision after merging AI suggestion with hard rules. */
  fromAi: boolean
}

type RuleDef = {
  id: string
  test: (text: string) => boolean
  priority: TicketPriority
  category?: string
  reason: string
}

/**
 * Extensible hard rules — AI suggestions never outrank these.
 * Order: first match wins for priority floor (highest severity applied).
 */
export const INTAKE_PRIORITY_RULES: RuleDef[] = [
  {
    id: 'water_electric',
    test: (t) =>
      /(מים|נזיל).{0,24}(חשמל|לוח|שקע|ארון)|(חשמל|לוח|שקע).{0,24}(מים|נזיל)|water\s+near\s+electr/i.test(
        t,
      ),
    priority: 'critical',
    category: 'electrical_hazard',
    reason: 'מים + חשמל',
  },
  {
    id: 'safety_hazard',
    test: (t) =>
      /עשן|שריפה|אש\b|להבה|ניצוצ|ריח\s*שרוף|חוט\s*חשוף|smoke|fire|spark|burning\s*smell|exposed\s*wir/i.test(
        t,
      ),
    priority: 'critical',
    category: 'electrical_hazard',
    reason: 'סכנת בטיחות',
  },
  {
    id: 'entrance_door',
    test: (t) =>
      /(דלת\s*(כניסה|ראשית)|כניסה).{0,40}(לא\s*(נסגר|ננעל|נסגרת)|תקוע|פתוח)|entrance\s*door/i.test(
        t,
      ) || /דלת.{0,20}(לא\s*נסגר|לא\s*ננעל)/i.test(t),
    priority: 'high',
    category: 'security',
    reason: 'דלת כניסה שלא נסגרת/ננעלת',
  },
  {
    id: 'significant_water_leak',
    test: (t) =>
      /(נזיל|דליפ|מים\s*זורמ|הצפ).{0,30}(משמעות|חזק|רב|מהתקרה|מהמזגן)|significant\s*leak|major\s*leak/i.test(
        t,
      ) || /נזיל.{0,20}(מזגן|תקרה|קיר)/i.test(t),
    priority: 'high',
    category: 'plumbing',
    reason: 'דליפת מים משמעותית',
  },
  {
    id: 'decorative_lighting',
    test: (t) =>
      /(תאורת?\s*דקור|דקורטיב|ויטרינה|שלט\s*מואר|decorative\s*light)/i.test(t),
    priority: 'low',
    category: 'electrical',
    reason: 'תאורה דקורטיבית',
  },
]

const PRIORITY_RANK: Record<TicketPriority, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
}

function maxPriority(a: TicketPriority, b: TicketPriority): TicketPriority {
  return PRIORITY_RANK[a] >= PRIORITY_RANK[b] ? a : b
}

/**
 * Merge AI suggestion with keyword classifier + hard rules.
 * Hard rules can raise priority; decorative lighting can lower when no hazard.
 */
export function applyIntakeRules(params: {
  text: string
  ai?: Pick<IntakeAgentOutput, 'category' | 'priority_suggestion'> | null
}): RulesResult {
  const text = params.text.trim()
  const classified = classifyFaultText(text)
  const applied: AppliedRule[] = [
    {
      id: 'classifyFaultText',
      reason: 'keyword classifier',
      category: classified.category,
      priority: classified.priority,
    },
  ]

  let category = params.ai?.category ?? classified.category
  let priority: TicketPriority =
    params.ai?.priority_suggestion ?? classified.priority

  // Keyword classifier is a safety floor when AI is lower
  priority = maxPriority(priority, classified.priority)
  if (
    classified.category === 'electrical_hazard' ||
    (!params.ai && classified.category !== 'other')
  ) {
    if (
      PRIORITY_RANK[classified.priority] >= PRIORITY_RANK[priority] ||
      classified.category === 'electrical_hazard'
    ) {
      category = classified.category
    }
  }

  let decorativeOnly = false
  for (const rule of INTAKE_PRIORITY_RULES) {
    if (!rule.test(text)) continue
    applied.push({
      id: rule.id,
      reason: rule.reason,
      priority: rule.priority,
      category: rule.category,
    })
    if (rule.id === 'decorative_lighting') {
      decorativeOnly = true
      continue
    }
    priority = maxPriority(priority, rule.priority)
    if (rule.category) category = rule.category
    decorativeOnly = false
  }

  // Decorative lighting lowers only when no higher-severity rule fired
  const hazardApplied = applied.some(
    (r) =>
      r.id === 'water_electric' ||
      r.id === 'safety_hazard' ||
      r.id === 'entrance_door' ||
      r.id === 'significant_water_leak',
  )
  if (decorativeOnly && !hazardApplied) {
    priority = 'low'
    category = 'electrical'
  }

  // HVAC + leak → ensure at least high (plan example)
  if (
    /מזגן|מיזוג|hvac|air\s*cond/i.test(text) &&
    /נזיל|דליפ|מים|leak/i.test(text)
  ) {
    applied.push({
      id: 'hvac_leak',
      reason: 'מזגן + נזילה',
      priority: 'high',
      category: 'hvac',
    })
    priority = maxPriority(priority, 'high')
    category = 'hvac'
  }

  return {
    category,
    priority,
    applied,
    fromAi: Boolean(params.ai),
  }
}

/** Heuristic: description too thin to open a ticket without clarification. */
export function descriptionNeedsClarification(
  text: string,
  hasMedia: boolean,
): { needs: boolean; question: string | null } {
  const t = text.trim()
  if (hasMedia && t.length >= 3) return { needs: false, question: null }
  if (t.length < 6) {
    return {
      needs: true,
      question: 'נא לתאר בקצרה מה התקלה (למשל: מזגן לא מקרר / נזילה).',
    }
  }
  if (/^(תקלה|בעיה|שבור|לא עובד|עזרה)\.?$/i.test(t)) {
    return {
      needs: true,
      question: 'מה בדיוק לא עובד? ציינו מכשיר או מיקום בחנות.',
    }
  }
  return { needs: false, question: null }
}
