/**
 * Approved Meta WhatsApp Cloud API templates (outside 24h care window).
 * Submit via Business Manager — see docs/META_WHATSAPP_TEMPLATE_FOLLOWUP.md
 */

export const META_WA_TEMPLATES = {
  /** Ops inbox: reopen conversation after 24h (no body variables). */
  followup: {
    metaName: 'maintainos_followup',
    language: 'he',
    category: 'UTILITY' as const,
    body: [
      'שלום, צוות התחזוקה של Optical Center כאן.',
      'יש לנו עדכון לגבי דיווח שפתחתם.',
      'נא להשיב להודעה זו כדי שנמשיך את השיחה.',
    ].join('\n'),
    quickReplies: ['אשמח לעדכון', 'הכל בסדר תודה'] as const,
  },
  /**
   * Ops owner alert when the 24h window is closed.
   * One body variable: a short headline. Not the store follow-up template.
   */
  deskAlert: {
    metaName: 'maintainos_desk_alert',
    language: 'he',
    category: 'UTILITY' as const,
    body: [
      'יש פריט שמחכה להחלטה: {{1}}',
      'פתחו את מסך האישורים במערכת.',
    ].join('\n'),
  },
  /** Optional parameterized utility (ticket display number). */
  ticketUpdate: {
    metaName: 'maintainos_ticket_update',
    language: 'he',
    category: 'UTILITY' as const,
    body: [
      'עדכון לתקלה {{1}}: יש לנו מידע חדש מהצוות.',
      'נא להשיב להודעה זו להמשך הטיפול.',
    ].join('\n'),
  },
} as const

/** Default session-reopen template name (env WHATSAPP_SESSION_TEMPLATE overrides). */
export function defaultSessionTemplateName(): string {
  return (
    process.env.WHATSAPP_SESSION_TEMPLATE?.trim() ||
    META_WA_TEMPLATES.followup.metaName
  )
}

export function defaultSessionTemplateLang(): string {
  return (
    process.env.WHATSAPP_SESSION_TEMPLATE_LANG?.trim() ||
    META_WA_TEMPLATES.followup.language
  )
}

/** Desk alert when free text is rejected outside the 24h window. */
export function defaultDeskAlertTemplateName(): string {
  return (
    process.env.WHATSAPP_DESK_TEMPLATE?.trim() ||
    META_WA_TEMPLATES.deskAlert.metaName
  )
}

/** Meta body parameters reject newlines and long runs of spaces. */
export function deskAlertParameter(message: string): string {
  const flat = message
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/ {2,}/g, ' ')
    .trim()
    .slice(0, 200)
  return flat || 'פריט שמחכה להחלטה'
}
