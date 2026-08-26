/**
 * Cost-aware outbound WhatsApp policy for the Israel pilot.
 * Prefer free user-initiated service window; avoid paid templates for marketing spam.
 * Lifecycle status updates (store + tech) are allowed — they are sparse, event-driven.
 */
export type OutboundPurpose =
  | 'intake_reply'
  | 'ticket_confirmation'
  | 'status_update'
  | 'ops_reply'
  | 'marketing'

export function shouldSendWhatsApp(purpose: OutboundPurpose): boolean {
  if (purpose === 'intake_reply' || purpose === 'ticket_confirmation') return true
  // Phase 5: store/tech lifecycle notifies on real status changes (not marketing).
  if (purpose === 'status_update' || purpose === 'ops_reply') return true
  if (purpose === 'marketing') return false
  return false
}
