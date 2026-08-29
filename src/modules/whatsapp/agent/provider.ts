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

export type IntakeLlmProvider = 'gateway' | 'gemini' | 'anthropic' | 'none'

export function resolveIntakeLlmProvider(): IntakeLlmProvider {
  return routeToProviderLabel(resolveIntakeRoute())
}

export function isWhatsAppAiIntakeEnabled(): boolean {
  if (process.env.WHATSAPP_AI_INTAKE_ENABLED === 'false') return false
  if (process.env.WHATSAPP_AI_INTAKE_ENABLED === 'true') {
    return resolveIntakeLlmProvider() !== 'none'
  }
  // Auto-enable when Vercel Gateway / Gemini / Anthropic is configured
  return resolveIntakeLlmProvider() !== 'none'
}

const SYSTEM_INSTRUCTION = `אתה AI Intake Agent של MaintainOS לתחזוקת חנויות Optical Center.
נתח דיווח תקלה בעברית והחזר JSON בלבד לפי הסכמה.
כללים:
- category אחת מהרשימה
- summary קצר וברור בעברית (משפט אחד)
- asset: מכשיר/מיקום בחנות אם מוזכר, אחרת null
- priority_suggestion: הצעה בלבד (critical/high/medium/low)
- needs_clarification: true רק אם חסר מידע קריטי לפתיחת תקלה
- clarification_question: שאלה אחת קצרה בעברית או null
- possible_duplicate_hint: null אלא אם ברור שזו חזרה על דיווח
- אל תמציא פרטים שלא נאמרו
- אל תהיה נחמד או שיחתי — תמציתי בלבד`

/**
 * Call LLM via Vercel AI SDK (AI Gateway preferred) for structured intake JSON.
 * Returns null when disabled / no keys / failure (caller uses rules fallback).
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
    'החזר JSON בלבד.',
  ]
    .filter(Boolean)
    .join('\n')

  try {
    const { output } = await generateText({
      model: resolved.model,
      system: SYSTEM_INSTRUCTION,
      prompt,
      temperature: 0.2,
      output: Output.object({
        name: 'whatsapp_intake',
        description: 'Structured WhatsApp fault intake for MaintainOS',
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
