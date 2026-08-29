/**
 * AI-powered WhatsApp response generator.
 * Rewrites fixed template text into natural Hebrew while preserving facts.
 *
 * Uses Vercel AI SDK (+ AI Gateway when available).
 * Enable: WHATSAPP_AI_ENABLED=true + (AI Gateway auth OR ANTHROPIC / Gemini key)
 * Falls back to the base template on any error or when disabled.
 */

import { generateText } from 'ai'
import { resolveReplyModel, resolveReplyRoute } from './ai-sdk/models'

export type WhatsAppAiSituation =
  | 'intake_ask_store'
  | 'intake_store_not_found'
  | 'intake_ask_description'
  | 'intake_need_description'
  | 'intake_confirmed'
  | 'intake_media_not_saved'
  | 'intake_country_missing'
  | 'intake_generic_error'
  | 'lifecycle_assigned'
  | 'lifecycle_in_progress'
  | 'lifecycle_waiting_parts'
  | 'lifecycle_resolved'
  | 'lifecycle_closed'
  | 'lifecycle_tech_assigned'

const SYSTEM_PROMPT = `אתה עוזר WhatsApp של MaintainOS — מערכת תחזוקה תפעולית לרשת חנויות Optical Center בישראל.
תפקידך לשלוח הודעות קצרות, ידידותיות ומקצועיות לעובדי חנות בעברית.
כללים:
- עברית בלבד
- מקסימום 4 משפטים
- שמור על כל הפרטים החשובים מהתבנית (מספר תקלה, שם חנות, קוד חנות, שם טכנאי, קישורים)
- אל תוסיף ברכות ארוכות
- אל תמציא פרטים שלא מופיעים בתבנית
- אמוג'י — רק אם הם בתבנית המקורית
- טון: תפעולי, ברור, לא שיווקי`

const SITUATION_HINT: Partial<Record<WhatsAppAiSituation, string>> = {
  intake_ask_store: 'המשתמש לא זוהה — צריך לבקש קוד חנות או סריקת QR/NFC',
  intake_store_not_found: 'קוד חנות שנשלח לא נמצא במערכת',
  intake_ask_description: 'החנות זוהתה — צריך תיאור תקלה',
  intake_need_description: 'חסר תיאור תקלה',
  intake_confirmed: 'תקלה נפתחה בהצלחה — אישור לדיווח',
  intake_media_not_saved: 'התמונה לא נשמרה אך התקלה נקלטה',
  intake_country_missing: 'שגיאת הגדרות — לא זוהתה מדינה למספר WhatsApp',
  intake_generic_error: 'שגיאה זמנית בקליטת דיווח',
  lifecycle_assigned: 'עדכון לעובד החנות — טכנאי שויך לתקלה',
  lifecycle_in_progress: 'עדכון — הטכנאי התחיל טיפול',
  lifecycle_waiting_parts: 'עדכון — ממתינים לחלקים',
  lifecycle_resolved: 'עדכון — התקלה טופלה',
  lifecycle_closed: 'עדכון — התקלה נסגרה',
  lifecycle_tech_assigned: 'הודעה לטכנאי על שיוך לתקלה',
}

export function isWhatsAppAiEnabled(): boolean {
  return (
    process.env.WHATSAPP_AI_ENABLED === 'true' &&
    resolveReplyRoute() !== 'none'
  )
}

/** Interpolate {{key}} placeholders before AI rewrite (Bamakor pattern). */
export function interpolateWhatsAppTemplate(
  text: string,
  vars: Record<string, string> = {},
): string {
  let out = text
  for (const [key, val] of Object.entries(vars)) {
    out = out.split(`{{${key}}}`).join(val)
  }
  return out
}

/**
 * Rewrite a base template into natural WhatsApp Hebrew.
 * @param baseText — already-interpolated template (or WA_COPY string)
 */
export async function enhanceWhatsAppMessage(
  baseText: string,
  context?: {
    situation?: WhatsAppAiSituation
    vars?: Record<string, string>
  },
): Promise<string> {
  const interpolated = context?.vars
    ? interpolateWhatsAppTemplate(baseText, context.vars)
    : baseText

  if (!isWhatsAppAiEnabled()) return interpolated

  const resolved = await resolveReplyModel()
  if (!resolved) return interpolated

  try {
    const situationHint = context?.situation
      ? SITUATION_HINT[context.situation]
      : undefined

    const prompt =
      `צור הודעת WhatsApp טבעית ויפה למצב הזה.\n` +
      (situationHint ? `מצב: ${situationHint}\n` : '') +
      `תבנית בסיסית:\n${interpolated}\n\n` +
      `החזר רק את טקסט ההודעה, ללא הסברים.`

    const { text } = await generateText({
      model: resolved.model,
      system: SYSTEM_PROMPT,
      prompt,
      maxOutputTokens: 300,
    })

    if (text?.trim()) return text.trim()
  } catch (e) {
    console.warn(
      '[whatsapp-ai] AI generation failed, using template fallback:',
      e instanceof Error ? e.message : String(e),
    )
  }

  return interpolated
}
