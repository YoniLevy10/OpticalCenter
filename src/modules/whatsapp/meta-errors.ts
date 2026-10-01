/**
 * Meta Graph WhatsApp error mapping + retry classification.
 * Adapted from Bino lib/whatsapp-meta-errors.ts for MaintainOS.
 */

export type WhatsAppMetaError = {
  httpStatus: number
  metaCode?: number
  message?: string
}

export function whatsAppMetaErrorHint(
  code: number | undefined,
  httpStatus?: number,
): string {
  if (httpStatus === 404) {
    return 'Meta החזיר 404 — בדקו Phone Number ID או שם תבנית'
  }
  if (httpStatus === 0) return 'timeout או שגיאת רשת'
  if (code === 131047) {
    return 'חלון 24 השעות פג — נדרשת תבנית מאושרת'
  }
  if (code === 132001) {
    return 'תבנית Meta לא קיימת או לא מאושרת'
  }
  if (code === 190) return 'טוקן WhatsApp פג — עדכנו WHATSAPP_ACCESS_TOKEN'
  if (code === 131026) return 'לא ניתן לשלוח למספר זה'
  if (code === 132000) return 'פרמטרים לא תואמים לתבנית'
  if (code === 132018) {
    return 'פרמטרי התבנית לא תקינים'
  }
  if (code === 132015) return 'תבנית paused או disabled ב-Meta'
  return 'שליחת WhatsApp נכשלה'
}

/** Errors that cron retry cannot fix without manual config changes. */
export function isNonRetryableWhatsAppMetaError(
  code: number | undefined,
): boolean {
  if (code == null) return false
  return [132001, 190, 100, 132000, 132015, 132018, 131026, 131047].includes(
    code,
  )
}

export function isTransientHttpStatus(status: number): boolean {
  return status === 0 || status === 429 || status >= 500
}

export function formatWhatsAppFailureMessage(
  label: string,
  meta?: WhatsAppMetaError,
): string {
  const hint = whatsAppMetaErrorHint(meta?.metaCode, meta?.httpStatus)
  const parts = [`${label}: ${hint}`]
  if (meta?.metaCode != null) parts.push(`(קוד Meta ${meta.metaCode})`)
  if (meta?.message?.trim()) parts.push(`— ${meta.message.trim()}`)
  return parts.join(' ')
}
