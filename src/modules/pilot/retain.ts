import { formatIls } from '@/modules/spend/true-cost'

/** The store that most needs Ari right now. He hears the name, not a ranking method. */
export type WorstStore = {
  name: string
  open: number
  overdue: number
  lead: string
}

export type RetainFacts = {
  waiting: number
  approved: number
  paid: number
  bundleSaved: number
  repeatCost: number
  repeats: number
  topCategory: string | null
  topCategoryAmount: number
  ranges: { label: string; low: number; high: number }[]
  worstStore: WorstStore | null
}

/**
 * Speaks as Ari's assistant. The stake is his stores and his money.
 * The reason this screen exists stays out of the sentences he reads.
 */
export function openingLine(facts: RetainFacts): string {
  const store = storeSentence(facts.worstStore)
  const saved =
    facts.bundleSaved > 0
      ? `ביקור אחד כבר חסך ${formatIls(facts.bundleSaved)} מול שתי קריאות נפרדות.`
      : null
  const money = `מחכים לאישור ${formatIls(facts.waiting)}, ו־${formatIls(facts.approved)} כבר אושרו.`
  return ['ארי,', store, saved, money].filter(Boolean).join(' ')
}

/** Answers from the same facts. Does not open tickets or send him elsewhere. */
export function answerRetention(question: string, facts: RetainFacts): string {
  const q = question.trim()
  if (/יעלה|הערכ|בערך|טווח|תחזית|נחש|כמה עולה|כמה זה יעלה/i.test(q)) {
    return recordedRangeReply(facts)
  }
  if (/כמה|רשום|מחכה|שולם|אושר/i.test(q)) {
    const top = facts.topCategory
      ? ` הכי הרבה רשום על ${facts.topCategory}, ${formatIls(facts.topCategoryAmount)}.`
      : ''
    return `מחכה לאישור ${formatIls(facts.waiting)}. כבר אושר ${formatIls(facts.approved)}. שולם ${formatIls(facts.paid)}.${top}`
  }
  if (/חזר|חוזר|מניע/i.test(q)) {
    if (facts.repeatCost > 0) {
      return `${facts.repeats} תקלות חזרו, ועלותן שנרשמה היא ${formatIls(facts.repeatCost)}. החזרה הבאה היא מה שאפשר לעצור.`
    }
    if (facts.repeats > 0) {
      return `יש ${facts.repeats} תקלות שחזרו, ועדיין בלי סכום שנרשם עליהן.`
    }
    return 'עדיין אין תקלה שחזרה עם מחיר. כשתחזור, היא תישאר כאן עם הסכום.'
  }
  if (/סניף|בעיית|דחוף|פתוח|תקלה|שיגור|דשבורד|מידע/i.test(q)) {
    return storeReply(facts)
  }
  if (/למה|שווה/i.test(q)) {
    const top =
      facts.topCategory && facts.topCategoryAmount > 0
        ? `הכי הרבה רשום על ${facts.topCategory}, ${formatIls(facts.topCategoryAmount)}.`
        : ''
    return [storeReply(facts), top].filter(Boolean).join(' ')
  }
  return `${openingLine(facts)} אפשר לשאול על הסניף, על מה שמחכה, או על מה שחוזר.`
}

function storeSentence(store: WorstStore | null): string | null {
  if (!store) return null
  if (store.overdue > 0) return `${store.name} דורש אותך עכשיו: ${store.lead}.`
  const open = store.open === 1 ? 'תקלה פתוחה אחת' : `${store.open} תקלות פתוחות`
  return `${store.name} עם ${open}, בראש ${store.lead}.`
}

function storeReply(facts: RetainFacts): string {
  const store = facts.worstStore
  if (!store) return 'אין עכשיו סניף עם תקלה פתוחה.'
  const open = store.open === 1 ? 'תקלה פתוחה אחת' : `${store.open} תקלות פתוחות`
  const late =
    store.overdue === 0
      ? 'אף אחת עדיין לא חורגת.'
      : store.overdue === 1
        ? 'אחת כבר חורגת.'
        : `${store.overdue} כבר חורגות.`
  const money =
    facts.topCategoryAmount > 0 && facts.topCategory
      ? ` הכי הרבה כסף רשום על ${facts.topCategory}, ${formatIls(facts.topCategoryAmount)}.`
      : ''
  return `${store.name}: ${open}. ${late} בראש ${store.lead}.${money}`
}

function recordedRangeReply(facts: RetainFacts): string {
  const ranges = facts.ranges ?? []
  if (ranges.length === 0) return 'אין עדיין מחיר שנרשם, אז אין טווח.'
  const lines = ranges.map((row) =>
    row.low === row.high
      ? `${row.label}: מחיר אחד שנרשם, ${formatIls(row.low)}`
      : `${row.label}: ${formatIls(row.low)}–${formatIls(row.high)}`,
  )
  return `הטווח הוא הקצוות של מחירים שכבר נרשמו מאותו סוג.\n${lines.join('\n')}`
}
