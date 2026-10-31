import { generateText, Output } from 'ai'
import { logEvent } from '@/lib/logging'
import {
  resolveIntakeModel,
  resolveIntakeRoute,
  routeToProviderLabel,
} from '../ai-sdk/models'
import {
  intakeAgentOutputSchema,
  parseIntakeAgentOutput,
  safeParseIntakeAgentOutput,
  type IntakeAgentOutput,
} from './schema'

export type IntakeLlmProvider = 'gateway' | 'none'

export function resolveIntakeLlmProvider(): IntakeLlmProvider {
  return routeToProviderLabel(resolveIntakeRoute())
}

export function isWhatsAppAiIntakeEnabled(): boolean {
  if (process.env.WHATSAPP_AI_INTAKE_ENABLED === 'false') return false
  if (process.env.WHATSAPP_AI_INTAKE_ENABLED === 'true') {
    return resolveIntakeLlmProvider() !== 'none'
  }
  // Auto-enable only when Vercel AI Gateway is configured
  return resolveIntakeLlmProvider() !== 'none'
}

const SYSTEM_INSTRUCTION = `You are the MaintainOS intake agent for Optical Center stores.
The report may be Hebrew, English, or French. Read it in that language and return JSON only.
Rules:
- category: one value from the list
- summary: one sentence in the SAME language as the report. Do not translate. Do not add facts.
- asset: device or place in the store if stated, otherwise null
- priority_suggestion: fill the field. Rules ignore it and set the real priority.
- needs_clarification: true only when a critical fact is missing, or the message is not a fault (thanks, ok, merci, תודה). A complete fault does not need a question.
- clarification_question: one short question in the SAME language as the report, or null. For thanks, ask if there is another fault. Do not open a ticket for thanks.
- possible_duplicate_hint: null unless this is clearly a repeat of an earlier report
- Do not invent a price, a vendor, a cause, or any detail that was not said
- Do not chat`

/**
 * Structured intake via Vercel AI Gateway only.
 * Returns null when Gateway is off / failure (caller uses rules fallback).
 */
export async function callIntakeLlm(params: {
  text: string
  storeName?: string | null
  storeCode?: string | null
  hasMedia?: boolean
  history?: Array<{ role: 'user' | 'assistant'; text: string }>
}): Promise<{ output: IntakeAgentOutput; provider: IntakeLlmProvider } | null> {
  if (!isWhatsAppAiIntakeEnabled()) return null
  const resolved = await resolveIntakeModel()
  if (!resolved) return null

  const provider = routeToProviderLabel(resolved.route)

  const historyBlock =
    params.history && params.history.length
      ? `\nהיסטוריה קצרה:\n${params.history
          .slice(-6)
          .map((h) => `${h.role}: ${h.text}`)
          .join('\n')}`
      : ''

  const prompt = [
    `חנות: ${params.storeName || '?'} (${params.storeCode || '?'})`,
    `יש מדיה מצורפת: ${params.hasMedia ? 'כן' : 'לא'}`,
    `דיווח:\n${params.text}`,
    historyBlock,
    'Return JSON only.',
  ]
    .filter(Boolean)
    .join('\n')

  try {
    const { output } = await generateText({
      model: resolved.model,
      system: SYSTEM_INSTRUCTION,
      prompt,
      temperature: 0.2,
      // Hard cap so a hung Gateway call cannot starve the outbound reply.
      abortSignal: AbortSignal.timeout(12_000),
      output: Output.object({
        name: 'whatsapp_intake',
        description: 'Structured WhatsApp fault intake for MILO',
        schema: intakeAgentOutputSchema,
      }),
    })

    if (!output) throw new Error('Empty structured output')
    const parsed = parseIntakeAgentOutput(output)
    logEvent('whatsapp:intake_ai', 'info', 'llm_ok', {
      provider,
      model: resolved.modelId,
    })
    return { output: parsed, provider }
  } catch (e) {
    logEvent('whatsapp:intake_ai', 'warn', 'llm_failed', {
      provider,
      model: resolved.modelId,
      error: e instanceof Error ? e.message : 'unknown',
    })
    return null
  }
}

/** Test helper — validate arbitrary JSON against schema. */
export function tryParseIntakeJson(raw: unknown) {
  return safeParseIntakeAgentOutput(raw)
}
