import type { TicketPriority } from '@/modules/tickets/constants'
import { TICKET_CATEGORY_LABELS_HE, TICKET_PRIORITY_LABELS_HE } from '@/modules/tickets/constants'

/** Where the current category/priority came from — never a fake confidence score. */
export type ClassificationSource = 'rules' | 'model' | 'manual'

export type ClassificationExplain = {
  source: ClassificationSource
  /** Short Hebrew line for Ari — reason, not a percentage. */
  explanationHe: string
  /** Human label for source chip. */
  sourceLabelHe: string
  /** What HQ should review, if anything. */
  needsReview: string[]
  /** Model was expected but failed — rules decided. */
  modelFailed: boolean
  category: string
  priority: TicketPriority | string
  appliedRuleReasons: string[]
  aiSummary: string | null
  corrected: {
    at: string
    fromCategory: string
    fromPriority: string
    toCategory: string
    toPriority: string
    reason: string | null
  } | null
}

type AppliedRule = {
  id?: string
  reason?: string
  priority?: string
  category?: string
}

type RulesBlob = {
  category?: string
  priority?: string
  applied?: AppliedRule[]
  fromAi?: boolean
}

type AiBlob = {
  summary?: string | null
  category?: string
  priority_suggestion?: string
  needs_clarification?: boolean
  clarification_question?: string | null
}

type AiRawBlob = {
  ai?: AiBlob | null
  rules?: RulesBlob | null
  provider?: 'gateway' | 'none' | 'rules' | string | null
  original?: string | null
  asset?: string | null
  /** Set after HQ correction. */
  corrected?: {
    at?: string
    from?: { category?: string; priority?: string }
    to?: { category?: string; priority?: string }
    reason?: string | null
    actorId?: string | null
  } | null
  source?: ClassificationSource | string | null
}

const SOURCE_LABEL: Record<ClassificationSource, string> = {
  rules: 'כללים',
  model: 'מודל',
  manual: 'ידני',
}

function asRecord(raw: unknown): AiRawBlob | null {
  if (!raw || typeof raw !== 'object') return null
  return raw as AiRawBlob
}

function categoryLabel(category: string): string {
  if (category === 'electrical_hazard') return 'סכנת חשמל'
  return TICKET_CATEGORY_LABELS_HE[category] ?? category
}

function priorityLabel(priority: string): string {
  return (
    TICKET_PRIORITY_LABELS_HE[priority as TicketPriority] ?? priority
  )
}

function appliedReasons(rules: RulesBlob | null | undefined): string[] {
  const applied = rules?.applied ?? []
  return applied
    .map((r) => (typeof r.reason === 'string' ? r.reason.trim() : ''))
    .filter(Boolean)
    .filter((r) => r !== 'keyword classifier')
}

/**
 * Build Ari-facing classification explanation from ticket.ai_raw.
 * Never invents a confidence percentage.
 */
export function explainClassification(params: {
  category: string
  priority: string
  aiRaw?: unknown
  aiSummary?: string | null
}): ClassificationExplain {
  const raw = asRecord(params.aiRaw)
  const rules = raw?.rules ?? null
  const ai = raw?.ai ?? null
  const provider = raw?.provider ?? null
  const correctedBlob = raw?.corrected ?? null
  const modelFailed = provider === 'none'

  const appliedRuleReasons = appliedReasons(rules)
  const corrected =
    correctedBlob && (raw?.source === 'manual' || correctedBlob.at)
      ? {
          at: String(correctedBlob.at ?? ''),
          fromCategory: String(correctedBlob.from?.category ?? ''),
          fromPriority: String(correctedBlob.from?.priority ?? ''),
          toCategory: String(correctedBlob.to?.category ?? params.category),
          toPriority: String(correctedBlob.to?.priority ?? params.priority),
          reason:
            typeof correctedBlob.reason === 'string'
              ? correctedBlob.reason
              : null,
        }
      : null

  let source: ClassificationSource = 'rules'
  if (corrected) source = 'manual'
  else if (provider === 'gateway' && ai) source = 'model'
  else source = 'rules'

  const needsReview: string[] = []
  if (modelFailed && !corrected) {
    needsReview.push('המודל לא החזיר סיווג — הוחל סיווג לפי כללים')
  }
  if (ai?.needs_clarification && !corrected) {
    needsReview.push(
      ai.clarification_question?.trim() ||
        'הסיווג ביקש הבהרה מהחנות — כדאי לבדוק',
    )
  }
  if (
    (params.category === 'other' || rules?.category === 'other') &&
    !corrected
  ) {
    needsReview.push('סוג התקלה מסווג כ«אחר» — כדאי לדייק')
  }
  if (
    source === 'model' &&
    ai?.priority_suggestion &&
    rules?.priority &&
    ai.priority_suggestion !== rules.priority &&
    !corrected
  ) {
    needsReview.push(
      `המודל הציע ${priorityLabel(ai.priority_suggestion)} והכללים קבעו ${priorityLabel(rules.priority)}`,
    )
  }

  const keywordHit = (rules?.applied ?? []).some(
    (r) => r.id === 'classifyFaultText',
  )

  let explanationHe: string
  if (corrected) {
    explanationHe = [
      'סיווג תוקן ידנית',
      corrected.fromCategory || corrected.fromPriority
        ? `מ־${categoryLabel(corrected.fromCategory)} / ${priorityLabel(corrected.fromPriority)}`
        : null,
      `ל־${categoryLabel(corrected.toCategory)} / ${priorityLabel(corrected.toPriority)}`,
      corrected.reason ? `· ${corrected.reason}` : null,
    ]
      .filter(Boolean)
      .join(' ')
  } else if (appliedRuleReasons.length > 0) {
    const head =
      source === 'model'
        ? 'סיווג ממודל עם רצפת בטיחות לפי כללים'
        : 'סיווג לפי כללים'
    explanationHe = `${head}: ${appliedRuleReasons.slice(0, 3).join(' · ')}`
  } else if (keywordHit || source === 'rules') {
    explanationHe = `סיווג לפי כללי מילות מפתח: ${categoryLabel(params.category)} · דחיפות ${priorityLabel(String(params.priority))}`
  } else if (ai?.summary?.trim()) {
    explanationHe =
      source === 'model'
        ? `סיווג ממודל לפי הדיווח: ${ai.summary.trim()}`
        : `סיווג לפי הדיווח: ${ai.summary.trim()}`
  } else if (params.aiSummary?.trim()) {
    explanationHe = `סיכום דיווח: ${params.aiSummary.trim()}`
  } else {
    explanationHe = `סוג ${categoryLabel(params.category)} · דחיפות ${priorityLabel(String(params.priority))}`
  }

  return {
    source,
    explanationHe,
    sourceLabelHe: SOURCE_LABEL[source],
    needsReview,
    modelFailed,
    category: params.category,
    priority: params.priority,
    appliedRuleReasons,
    aiSummary: ai?.summary?.trim() || params.aiSummary?.trim() || null,
    corrected,
  }
}

export function mergeAiRawAfterManualCorrection(
  previous: unknown,
  correction: {
    fromCategory: string
    fromPriority: string
    toCategory: string
    toPriority: string
    reason?: string | null
    actorId?: string | null
    at?: string
  },
): Record<string, unknown> {
  const base =
    previous && typeof previous === 'object'
      ? { ...(previous as Record<string, unknown>) }
      : {}
  return {
    ...base,
    source: 'manual',
    corrected: {
      at: correction.at ?? new Date().toISOString(),
      actorId: correction.actorId ?? null,
      reason: correction.reason?.trim() || null,
      from: {
        category: correction.fromCategory,
        priority: correction.fromPriority,
      },
      to: {
        category: correction.toCategory,
        priority: correction.toPriority,
      },
    },
  }
}

/** Build a minimal ai_raw snapshot from intake decision-shaped data (demo/seed). */
export function buildAiRawFromIntake(params: {
  provider: 'gateway' | 'none' | 'rules'
  rules: RulesBlob
  ai?: AiBlob | null
  original?: string | null
  asset?: string | null
}): Record<string, unknown> {
  return {
    ai: params.ai ?? null,
    rules: params.rules,
    provider: params.provider,
    original: params.original ?? null,
    asset: params.asset ?? null,
  }
}
