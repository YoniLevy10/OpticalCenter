import { callIntakeLlm, isWhatsAppAiIntakeEnabled } from './provider'
import {
  applyIntakeRules,
  descriptionNeedsClarification,
  type RulesResult,
} from './rules'
import { clarificationQuestion as questionInReportLanguage } from '../spoken-language'
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
 * Read one fault report. Rules set category and priority.
 * The model may summarize and, when the text is still unclear, ask one question.
 * Photos are stored. They are not interpreted.
 */
export async function runIntakeAgent(params: {
  text: string
  storeName?: string | null
  storeCode?: string | null
  hasMedia?: boolean
  history?: Array<{ role: 'user' | 'assistant'; text: string }>
}): Promise<IntakeDecision> {
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
  let needsClarification = false
  let clarificationQuestion: string | null = null

  if (heuristic.needs) {
    needsClarification = true
    clarificationQuestion = heuristic.question
  } else if (
    (summary.length < 8 || rules.category === 'other') &&
    ai?.needs_clarification &&
    ai.clarification_question
  ) {
    needsClarification = true
    clarificationQuestion = ai.clarification_question
  }

  if (needsClarification && !clarificationQuestion) {
    clarificationQuestion = questionInReportLanguage(text, 'detail')
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
