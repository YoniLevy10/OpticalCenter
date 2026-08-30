import type { TicketPriority } from '@/modules/tickets/constants'
import { TICKET_PRIORITY_LABELS_HE } from '@/modules/tickets/constants'

export const WA_COPY = {
  askStore:
    'שלום! לדיווח תקלה יש לשלוח את קוד החנות (למשל 172) או לסרוק את ה־QR / NFC בחנות.',
  storeNotFound: (code: string) =>
    `לא מצאתי חנות עם הקוד ${code}. בדקו את הקוד ונסו שוב (מספרים בלבד).`,
  askDescription: (storeName: string, storeCode: string) =>
    `זוהתה חנות: ${storeName} (${storeCode}).\nתארו בקצרה את התקלה. אפשר גם לצרף תמונה.`,
  needDescription: 'נא לתאר את התקלה בטקסט (או לצרף תמונה עם תיאור קצר).',
  confirmed: (displayNumber: string, storeName: string) =>
    `הדיווח התקבל ✓\nמספר תקלה: ${displayNumber}\nחנות: ${storeName}\nהצוות קיבל את הדיווח.`,
  /** Rich confirmation after AI intake. */
  confirmedIntake: (params: {
    displayNumber: string
    storeCode: string
    summary: string
    priority: TicketPriority
    duplicateHint?: string | null
  }) => {
    const assetLine = params.summary.replace(/\s+/g, ' ').trim()
    const lines = [
      `פתחתי תקלה #${params.displayNumber} ✅`,
      `${assetLine} · חנות ${params.storeCode}`,
      `עדיפות ${TICKET_PRIORITY_LABELS_HE[params.priority]}`,
      'צוות התחזוקה קיבל את הדיווח.',
    ]
    if (params.duplicateHint) {
      lines.push(`שימו לב: ${params.duplicateHint}`)
    }
    return lines.join('\n')
  },
  mediaNotSaved:
    'הדיווח נקלט, אך לא הצלחנו לשמור את התמונה. אפשר לשלוח אותה שוב בהודעה נפרדת.',
  mediaAttached: (displayNumber: string) =>
    `קיבלתי את התמונה ✓\nצורפה לתקלה #${displayNumber}`,
  countryMissing:
    'לא זוהתה מדינה עבור מספר הוואטסאפ. פנו לתמיכה או בדקו את הגדרות הסביבה.',
  genericError: 'אירעה תקלה זמנית בקליטת הדיווח. נסו שוב בעוד רגע.',
  humanTakeoverAck: null as string | null,
} as const
