import type { TicketPriority } from '@/modules/tickets/constants'
import { classifyFaultText } from '@/modules/tickets/classify'
import { clarificationQuestion } from '../spoken-language'
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
      /(מים|נזיל|eau|fuite).{0,30}(חשמל|לוח|שקע|ארון|[ée]lectr)|(חשמל|לוח|שקע|[ée]lectr).{0,30}(מים|נזיל|eau|fuite)|water\s+near\s+electr/i.test(
        t,
      ),
    priority: 'critical',
    category: 'electrical_hazard',
    reason: 'מים + חשמל',
  },
  {
    id: 'safety_hazard',
    test: (t) =>
      /עשן|שריפה|אש\b|להבה|ניצוצ|ריח\s*שרוף|חוט\s*חשוף|smoke|fire|spark|burning\s*smell|exposed\s*wir|fum[ée]e|incendie|\bfeu\b|flamme|[ée]tincelle|odeur\s+de\s+br[uû]l|fil\s+d[ée]nud/i.test(
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
      /(נזיל|דליפ|מים\s*זורמ|הצפ).{0,30}(משמעות|חזק|רב|מהתקרה|מהמזגן)|significant\s*leak|major\s*leak|grosse\s+fuite|fuite\s+importante|fuite.{0,24}(plafond|clim)/i.test(
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
 * Keyword classifier plus hard rules decide category and priority.
 * The model may name a category only when no keyword matched.
 * Its priority suggestion is recorded elsewhere and does not change the ticket.
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

  let category = classified.category
  let priority: TicketPriority = classified.priority
  if (
    category === 'other' &&
    params.ai?.category &&
    params.ai.category !== 'other'
  ) {
    category = params.ai.category
    applied.push({
      id: 'ai_category',
      reason: 'no keyword matched',
      category,
    })
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
    /מזגן|מיזוג|hvac|air\s*cond|climatisation|\bclim\b/i.test(text) &&
    /נזיל|דליפ|מים|leak|fuite|\beau\b/i.test(text)
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
    return { needs: true, question: clarificationQuestion(t, 'short') }
  }
  if (/^(תקלה|בעיה|שבור|לא עובד|עזרה|fault|problem|broken|help|panne|probl[èe]me|aide)\.?$/i.test(t)) {
    return { needs: true, question: clarificationQuestion(t, 'what') }
  }
  return { needs: false, question: null }
}
