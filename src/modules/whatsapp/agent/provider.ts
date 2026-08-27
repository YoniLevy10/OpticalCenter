import { logEvent } from '@/lib/logging'
import {
  INTAKE_AGENT_JSON_SCHEMA,
  parseIntakeAgentOutput,
  safeParseIntakeAgentOutput,
  type IntakeAgentOutput,
} from './schema'

export type IntakeLlmProvider = 'gemini' | 'openai' | 'none'

export function resolveIntakeLlmProvider(): IntakeLlmProvider {
  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim()) return 'gemini'
  if (process.env.OPENAI_API_KEY?.trim()) return 'openai'
  return 'none'
}

export function isWhatsAppAiIntakeEnabled(): boolean {
  if (process.env.WHATSAPP_AI_INTAKE_ENABLED === 'false') return false
  if (process.env.WHATSAPP_AI_INTAKE_ENABLED === 'true') {
    return resolveIntakeLlmProvider() !== 'none'
  }
  // Auto-enable when a free/paid key is present
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

function extractJsonObject(text: string): unknown {
  const trimmed = text.trim()
  try {
    return JSON.parse(trimmed)
  } catch {
    const start = trimmed.indexOf('{')
    const end = trimmed.lastIndexOf('}')
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1))
    }
    throw new Error('LLM response is not JSON')
  }
}

async function callGemini(userPrompt: string): Promise<IntakeAgentOutput> {
  const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY!.trim()
  const model =
    process.env.WHATSAPP_AI_INTAKE_MODEL?.trim() || 'gemini-2.0-flash'
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json',
        responseSchema: INTAKE_AGENT_JSON_SCHEMA,
      },
    }),
  })
  const json = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
    error?: { message?: string }
  }
  if (!res.ok) {
    throw new Error(json.error?.message || `Gemini HTTP ${res.status}`)
  }
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('Gemini empty response')
  return parseIntakeAgentOutput(extractJsonObject(text))
}

async function callOpenAi(userPrompt: string): Promise<IntakeAgentOutput> {
  const key = process.env.OPENAI_API_KEY!.trim()
  const model =
    process.env.WHATSAPP_AI_INTAKE_MODEL?.trim() || 'gpt-4o-mini'
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'whatsapp_intake',
          strict: true,
          schema: INTAKE_AGENT_JSON_SCHEMA,
        },
      },
      messages: [
        { role: 'system', content: SYSTEM_INSTRUCTION },
        { role: 'user', content: userPrompt },
      ],
    }),
  })
  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>
    error?: { message?: string }
  }
  if (!res.ok) {
    throw new Error(json.error?.message || `OpenAI HTTP ${res.status}`)
  }
  const text = json.choices?.[0]?.message?.content
  if (!text) throw new Error('OpenAI empty response')
  return parseIntakeAgentOutput(extractJsonObject(text))
}

/**
 * Call Gemini (preferred/free) or OpenAI for structured intake JSON.
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
  const provider = resolveIntakeLlmProvider()
  if (provider === 'none') return null

  const historyBlock =
    params.history && params.history.length
      ? `\nהיסטוריה קצרה:\n${params.history
          .slice(-6)
          .map((h) => `${h.role}: ${h.text}`)
          .join('\n')}`
      : ''

  const userPrompt = [
    `חנות: ${params.storeName || '?'} (${params.storeCode || '?'})`,
    `יש מדיה מצורפת: ${params.hasMedia ? 'כן' : 'לא'}`,
    `דיווח:\n${params.text}`,
    historyBlock,
    'החזר JSON בלבד.',
  ]
    .filter(Boolean)
    .join('\n')

  try {
    const output =
      provider === 'gemini'
        ? await callGemini(userPrompt)
        : await callOpenAi(userPrompt)
    logEvent('whatsapp:intake_ai', 'info', 'llm_ok', { provider })
    return { output, provider }
  } catch (e) {
    logEvent('whatsapp:intake_ai', 'warn', 'llm_failed', {
      provider,
      error: e instanceof Error ? e.message : 'unknown',
    })
    return null
  }
}

/** Test helper — validate arbitrary JSON against schema. */
export function tryParseIntakeJson(raw: unknown) {
  return safeParseIntakeAgentOutput(raw)
}
