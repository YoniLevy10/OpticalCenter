/**
 * Cost-aware outbound WhatsApp policy for the Israel pilot.
 * Prefer free user-initiated service window; avoid paid templates for status spam.
 */
export type OutboundPurpose =
  | 'intake_reply'
  | 'ticket_confirmation'
  | 'status_update'
  | 'marketing'

export function shouldSendWhatsApp(purpose: OutboundPurpose): boolean {
  if (purpose === 'intake_reply' || purpose === 'ticket_confirmation') return true
  // Status updates go to HQ /tech PWA — not WhatsApp — in pilot.
  if (purpose === 'status_update') return false
  if (purpose === 'marketing') return false
  return false
}
