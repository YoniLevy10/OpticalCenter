import { normalizePhoneDigits } from '@/lib/phone'
import type { LifecycleTicket } from './lifecycle'

/**
 * Technician assign SMS (019) — short, actionable Hebrew.
 * Keep under ~2 SMS segments when possible (Hebrew UCS-2).
 */
export function buildTechnicianAssignedSms(input: {
  displayNumber: string
  storeName: string
  link: string
}): string {
  const display = input.displayNumber.trim()
  const store = input.storeName.trim() || 'חנות'
  const link = input.link.trim()
  const title = display ? `תקלה ${display}` : 'תקלה'
  return [
    `שיוך חדש · ${title}`,
    store,
    'לטיפול בטלפון:',
    link,
  ].join('\n')
}

/**
 * 019 `source` / SMS_019_SENDER constraints (official API):
 * max 11 chars, English letters + digits only (no Hebrew, spaces, or +).
 * Brand short code requested by ops: «opc».
 */
export const RECOMMENDED_SMS_019_SENDER = 'opc'

export type TechNotifyProfile = {
  id: string
  full_name?: string | null
  phone?: string | null
}

/**
 * Resolve the technician mobile for assign alerts.
 * Never falls back to the ticket reporter phone.
 */
export function resolveTechnicianNotifyPhone(
  tech: TechNotifyProfile | null | undefined,
  ticket: Pick<LifecycleTicket, 'reporter_phone'>,
): { phone: string | null; skipped?: string } {
  const techPhone = tech?.phone ? normalizePhoneDigits(tech.phone) : null
  if (!techPhone) return { phone: null, skipped: 'no_tech_phone' }

  const reporterPhone = ticket.reporter_phone
    ? normalizePhoneDigits(ticket.reporter_phone)
    : null
  if (reporterPhone && techPhone === reporterPhone) {
    return { phone: null, skipped: 'tech_phone_is_reporter' }
  }

  return { phone: techPhone }
}
