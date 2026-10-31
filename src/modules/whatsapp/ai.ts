/**
 * Fixed WhatsApp copy. The model does not paraphrase these messages.
 * Interpolation fills {{placeholders}}. The text that leaves is the template.
 */

import { resolveReplyRoute } from './ai-sdk/models'

export type WhatsAppAiSituation =
  | 'intake_ask_store'
  | 'intake_store_not_found'
  | 'intake_ask_description'
  | 'intake_need_description'
  | 'intake_confirmed'
  | 'intake_media_not_saved'
  | 'intake_non_issue_ack'
  | 'intake_country_missing'
  | 'intake_generic_error'
  | 'intake_voice_review'
  | 'intake_status'
  | 'intake_follow_up'
  | 'intake_human_handoff'
  | 'lifecycle_assigned'
  | 'lifecycle_in_progress'
  | 'lifecycle_waiting_parts'
  | 'lifecycle_resolved'
  | 'lifecycle_closed'
  | 'lifecycle_tech_assigned'

export function isWhatsAppAiEnabled(): boolean {
  return (
    process.env.WHATSAPP_AI_ENABLED === 'true' &&
    resolveReplyRoute() !== 'none'
  )
}

/** Interpolate {{key}} placeholders in a fixed template. */
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

/** Fill placeholders and return the template. Situation is kept for callers; it does not rewrite the text. */
export async function enhanceWhatsAppMessage(
  baseText: string,
  context?: {
    situation?: WhatsAppAiSituation
    vars?: Record<string, string>
  },
): Promise<string> {
  void context?.situation
  return context?.vars ? interpolateWhatsAppTemplate(baseText, context.vars) : baseText
}
