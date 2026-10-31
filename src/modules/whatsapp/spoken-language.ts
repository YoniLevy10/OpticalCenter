export type ReportLanguage = 'he' | 'en' | 'fr'

const FRENCH_WORD =
  /\b(fuite|climatisation|électricité|electricite|électri|electri|porte|magasin|panne|aussi|eau|serrure|alarme|plafond|facture|devis)\b/i

/** Hebrew, English, or French. Anything else stays on the network default, Hebrew. */
export function reportLanguage(text: string): ReportLanguage {
  const hebrew = text.match(/[\u0590-\u05FF]/g)?.length ?? 0
  if (hebrew >= 2) return 'he'
  const accents = text.match(/[àâçéèêëîïôùûœ]/gi)?.length ?? 0
  if (accents > 0 || FRENCH_WORD.test(text)) return 'fr'
  if (/[A-Za-z]/.test(text)) return 'en'
  return 'he'
}

const QUESTION = {
  he: {
    short: 'נא לתאר בקצרה מה התקלה (למשל: מזגן לא מקרר / נזילה).',
    what: 'מה בדיוק לא עובד? ציינו מכשיר או מיקום בחנות.',
    detail: 'נא להוסיף פרט אחד חשוב על התקלה (מיקום או מה לא עובד).',
  },
  en: {
    short: 'Briefly describe the fault (for example: AC not cooling / a leak).',
    what: 'What exactly is not working? Name the device or where it is in the store.',
    detail: 'Add one important detail: where it is, or what is not working.',
  },
  fr: {
    short: 'Décrivez brièvement la panne (par exemple : clim en panne / fuite).',
    what: 'Qu’est-ce qui ne marche pas ? Indiquez l’appareil ou l’endroit dans le magasin.',
    detail: 'Ajoutez un détail important : où c’est, ou ce qui ne marche pas.',
  },
} as const

export function clarificationQuestion(
  text: string,
  kind: keyof (typeof QUESTION)['he'],
): string {
  return QUESTION[reportLanguage(text)][kind]
}
