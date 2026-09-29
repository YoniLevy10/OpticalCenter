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
