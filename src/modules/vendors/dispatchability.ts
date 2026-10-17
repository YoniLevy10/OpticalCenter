/**
 * C07 — preferred vendor vs dial-only contact.
 * Dispatchable = partner webhook channel exists. No webhook → dial-only
 * (even if the row is a preferred vendor). Professionals are always dial-only.
 */

export type DispatchChannel = 'dispatchable' | 'dial_only'

export function vendorDispatchChannel(input: {
  webhook_url?: string | null
}): DispatchChannel {
  return input.webhook_url?.trim() ? 'dispatchable' : 'dial_only'
}

export function isDispatchableVendor(input: {
  webhook_url?: string | null
}): boolean {
  return vendorDispatchChannel(input) === 'dispatchable'
}

export const DISPATCH_LABELS = {
  dispatchable: 'שיגור דיגיטלי',
  dial_only: 'חיוג בלבד',
  preferredSection: 'ספקים מועדפים',
  prosSection: 'אנשי מקצוע שמורים',
  prosHint: 'אנשי קשר ממידרג — חיוג בלבד, בלי שיגור אוטומטי.',
  noChannelHint: 'אין ערוץ שיגור דיגיטלי — חיוג בלבד.',
  dispatchCta: 'שגר לספק',
  dialCta: 'חיוג',
} as const
