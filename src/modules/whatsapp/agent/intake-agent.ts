import { callIntakeLlm, isWhatsAppAiIntakeEnabled } from './provider'
import {
  applyIntakeRules,
  descriptionNeedsClarification,
  type RulesResult,
} from './rules'
import type { IntakeAgentOutput } from './schema'

export type IntakeDecision = {
  summary: string
  asset: string | null
  category: string
  priority: RulesResult['priority']
  needsClarification: boolean
  clarificationQuestion: string | null
  possibleDuplicateHint: string | null
  rules: RulesResult
  ai: IntakeAgentOutput | null
  provider: 'gateway' | 'none' | 'rules'
}

/**
 * AI Intake Agent: LLM structured extract (optional) + rules engine final say.
 * Vision signals reserved for future — not used in MVP.
 */
export async function runIntakeAgent(params: {
  text: string
  storeName?: string | null
  storeCode?: string | null
  hasMedia?: boolean
  history?: Array<{ role: 'user' | 'assistant'; text: string }>
  /** Future: visionSignals?: Record<string, unknown> */
  visionSignals?: Record<string, unknown> | null
}): Promise<IntakeDecision> {
  void params.visionSignals // architecture hook — unused in MVP

  const text = params.text.trim() || (params.hasMedia ? 'תמונה מצורפת' : '')
  const llm = await callIntakeLlm({
    text,
    storeName: params.storeName,
    storeCode: params.storeCode,
    hasMedia: params.hasMedia,
    history: params.history,
  })

  const ai = llm?.output ?? null
  const rules = applyIntakeRules({
    text,
    ai: ai
      ? {
          category: ai.category,
          priority_suggestion: ai.priority_suggestion,
        }
      : null,
  })

  const summary =
    ai?.summary?.trim() ||
    (text.length > 200 ? `${text.slice(0, 197)}…` : text) ||
    'דיווח WhatsApp'

  const heuristic = descriptionNeedsClarification(text, Boolean(params.hasMedia))
  let needsClarification = Boolean(ai?.needs_clarification) || heuristic.needs
  let clarificationQuestion =
    (ai?.needs_clarification && ai.clarification_question) ||
    heuristic.question ||
    null

  // Never clarify when we already have a solid summary + category from rules/AI
  if (
    !heuristic.needs &&
    summary.length >= 8 &&
    rules.category !== 'other' &&
    !ai?.needs_clarification
  ) {
    needsClarification = false
    clarificationQuestion = null
  }

  // Cap: if AI asks clarification but question empty — drop it
  if (needsClarification && !clarificationQuestion) {
    clarificationQuestion = 'נא להוסיף פרט אחד חשוב על התקלה (מיקום או מה לא עובד).'
  }

  return {
    summary,
    asset: ai?.asset ?? null,
    category: rules.category,
    priority: rules.priority,
    needsClarification,
    clarificationQuestion,
    possibleDuplicateHint: ai?.possible_duplicate_hint ?? null,
    rules,
    ai,
    provider: llm?.provider ?? (isWhatsAppAiIntakeEnabled() ? 'none' : 'rules'),
  }
}
