import { documentTypeDef, type DocumentIntakeStatus } from './rules'

/** hearing_a tympanometer · hearing_b audiometer · hearing_c acoustic booth. */
export type HearingCalibrationKey = 'hearing_a' | 'hearing_b' | 'hearing_c'

export type StoreNameRef = {
  code: string
  name: string
  city: string
}

export type CalibrationSlice = {
  docType: HearingCalibrationKey
  expiry: string | null
  /** stated = the certificate prints an expiry; computed = calibration date + cycle. */
  expirySource: 'stated' | 'computed' | null
}

/** Places Ari's filenames use that are not the store's display name. */
const PLACE_ALIASES: { test: RegExp; code: string }[] = [
  { test: /חונים\s*קונים/, code: '6007' },
  { test: /זבוטינסקי|גבוטינסקי/, code: '6021' },
  { test: /צק\s*פסט|שק\s*פוסט|צ['׳]ק\s*פוסט/, code: '6041' },
]

const CALIBRATION_PATTERNS: { docType: HearingCalibrationKey; test: RegExp }[] = [
  {
    docType: 'hearing_a',
    test: /טימפנומטר|טימפונומטר|tympanometer|כיול[\s_\-]*א|(?:^|[^a-z])hearing[_\s\-]?a(?![a-z])/i,
  },
  {
    docType: 'hearing_b',
    test: /אודיומטר|audiometer|כיול[\s_\-]*ב|(?:^|[^a-z])hearing[_\s\-]?b(?![a-z])/i,
  },
  {
    docType: 'hearing_c',
    test: /תא\s*אקוסטי|acoustic\s*booth|כיול[\s_\-]*ג|(?:^|[^a-z])hearing[_\s\-]?c(?![a-z])/i,
  },
]

export function findCalibrations(name: string, text?: string | null): HearingCalibrationKey[] {
  const hay = `${name}\n${text ?? ''}`
  return CALIBRATION_PATTERNS.filter((row) => row.test.test(hay)).map((row) => row.docType)
}

/** One certificate that names more than one instrument becomes one slice per instrument. */
export function splitCalibrations(name: string, text?: string | null): CalibrationSlice[] {
  const types = findCalibrations(name, text)
  if (types.length === 0) return []
  const body = text?.trim() ?? ''
  if (!body || types.length === 1) {
    return types.map((docType) => ({ docType, ...pickExpiry(docType, body) }))
  }

  const mentions = types
    .map((docType) => ({ docType, index: indexOfCalibration(body, docType) }))
    .filter((row) => row.index >= 0)
    .sort((a, b) => a.index - b.index)

  if (mentions.length !== types.length) {
    return types.map((docType) => ({ docType, expiry: null, expirySource: null }))
  }

  return mentions.map((mention, index) => {
    const end = mentions[index + 1]?.index ?? body.length
    const section = body.slice(mention.index, end)
    return { docType: mention.docType, ...pickExpiry(mention.docType, section) }
  })
}

export function calibrationIntake(
  slice: CalibrationSlice,
  storeCode: string | null,
): { intakeStatus: DocumentIntakeStatus; intakeReason: string | null } {
  if (!storeCode) {
    return { intakeStatus: 'needs_review', intakeReason: 'השיוך לסניף לא ודאי' }
  }
  if (!slice.expiry) {
    return { intakeStatus: 'needs_review', intakeReason: 'תאריך התוקף לא ברור' }
  }
  if (slice.expirySource === 'computed') {
    return {
      intakeStatus: 'ingested',
      intakeReason: 'התוקף חושב מתאריך הכיול לפי מחזור הבדיקה',
    }
  }
  return { intakeStatus: 'ingested', intakeReason: null }
}

/**
 * Store-named certificate with no instrument in the name or text.
 * Kept as a review row until the PDF text says which calibrations it covers.
 */
export function unclassifiedCertificateLabel(name: string, text?: string | null): string | null {
  if (findCalibrations(name, text).length > 0) return null
  if (!/אופטיקל\s*סנטר/.test(name)) return null
  return name.replace(/\.(pdf|jpe?g|png)$/i, '').trim()
}

export type StoreMatch = {
  code: string | null
  ambiguous: boolean
}

/** Match a Hebrew filename ("אודיומטר אשדוד", "אופטיקל סנטר כרמיאל") to one store. */
export function matchStoreFromLabel(label: string, stores: readonly StoreNameRef[]): StoreMatch {
  if (stores.length === 0) return { code: null, ambiguous: false }
  const byLength = [...stores].sort((a, b) => b.code.length - a.code.length)
  for (const store of byLength) {
    const re = new RegExp(`(?<!\\d)${store.code}(?!\\d)`)
    if (re.test(label)) return { code: store.code, ambiguous: false }
  }

  const known = new Set(stores.map((store) => store.code))
  const alias = PLACE_ALIASES.find((row) => row.test.test(label) && known.has(row.code))
  if (alias) return { code: alias.code, ambiguous: false }

  const hay = normalizeLabel(label)
  const scored = stores
    .map((store) => ({ code: store.code, score: scoreStore(hay, store) }))
    .filter((row) => row.score >= 8)
    .sort((a, b) => b.score - a.score)

  if (scored.length === 0) return { code: null, ambiguous: false }
  if (scored.length > 1 && scored[0].score === scored[1].score) {
    return { code: null, ambiguous: true }
  }
  return { code: scored[0].code, ambiguous: false }
}

function indexOfCalibration(text: string, docType: HearingCalibrationKey): number {
  const pattern = CALIBRATION_PATTERNS.find((row) => row.docType === docType)
  if (!pattern) return -1
  const match = pattern.test.exec(text)
  pattern.test.lastIndex = 0
  return match?.index ?? -1
}

function pickExpiry(
  docType: HearingCalibrationKey,
  section: string,
): { expiry: string | null; expirySource: 'stated' | 'computed' | null } {
  if (!section) return { expiry: null, expirySource: null }
  const dates = extractDates(section)
  const stated = uniqueIsos(dates.filter((row) => row.role === 'expiry'))
  if (stated.length === 1) return { expiry: stated[0], expirySource: 'stated' }
  if (stated.length > 1) return { expiry: null, expirySource: null }
  const bases = uniqueIsos(dates.filter((row) => row.role !== 'expiry'))
  if (bases.length !== 1) return { expiry: null, expirySource: null }
  const months = documentTypeDef(docType)?.cycleMonths ?? 12
  return { expiry: addMonthsUtc(bases[0], months), expirySource: 'computed' }
}

type DateHit = { iso: string; role: 'expiry' | 'calibration' | 'bare' }

function extractDates(text: string): DateHit[] {
  const re = /(\d{1,2})[./-](\d{1,2})[./-](20\d{2})|(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})/g
  const hits: DateHit[] = []
  for (const match of text.matchAll(re)) {
    const dayFirst = Boolean(match[1])
    const iso = dayFirst
      ? toIso(match[3], match[2], match[1])
      : toIso(match[4], match[5], match[6])
    if (!iso) continue
    const before = text.slice(Math.max(0, match.index - 24), match.index)
    const role = /תוקף|בתוקף|expiry|valid/i.test(before)
      ? 'expiry'
      : /כיול|בדיקה|בוצע|calibrat/i.test(before)
        ? 'calibration'
        : 'bare'
    hits.push({ iso, role })
  }
  return hits
}

function toIso(year: string, month: string, day: string): string | null {
  const y = Number(year)
  const m = Number(month)
  const d = Number(day)
  if (y < 2020 || y > 2036 || m < 1 || m > 12 || d < 1 || d > 31) return null
  const stamp = Date.parse(
    `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T00:00:00.000Z`,
  )
  if (Number.isNaN(stamp)) return null
  const check = new Date(stamp)
  if (check.getUTCMonth() + 1 !== m || check.getUTCDate() !== d) return null
  return check.toISOString()
}

export function addMonthsUtc(iso: string, months: number): string {
  const date = new Date(iso)
  const day = date.getUTCDate()
  date.setUTCDate(1)
  date.setUTCMonth(date.getUTCMonth() + months)
  const last = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate()
  date.setUTCDate(Math.min(day, last))
  return date.toISOString()
}

function uniqueIsos(rows: DateHit[]): string[] {
  return [...new Set(rows.map((row) => row.iso))]
}

function normalizeLabel(input: string): string {
  return input
    .replace(/[\u0591-\u05C7]/g, '')
    .replace(/\.(pdf|jpe?g|png|docx?|txt)$/i, ' ')
    .replace(/קריית/g, 'קרית')
    .replace(/שנקין/g, 'שינקין')
    .replace(/מיגדל/g, 'מגדל')
    .replace(/מודעין/g, 'מודיעין')
    .replace(/ככר\s*ציון/g, 'כיכר ציון')
    .replace(/מול\s*שבע|מול\s*7/g, ' mall7 ')
    .replace(/סטר\s*סנטר/g, ' סטאר ')
    .replace(/מקס/g, ' max ')
    .replace(/אופטיקל\s*סנטר/g, ' ')
    .replace(/טימפונומטר|טימפנומטר|אודיומטר|תא\s*אקוסטי/g, ' ')
    .replace(/כיול\s*[אבג]/g, ' ')
    .replace(/20(2[4-9])(?!\d)/g, ' ')
    .replace(/(?<!\d)(24|25|26|27)(?!\d)/g, ' ')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

function scoreStore(label: string, store: StoreNameRef): number {
  const city = normalizePhrase(store.city)
  const { words, digits } = branchTokens(store)
  const cityHit = city.length >= 2 && includesPhrase(label, city)
  const wordHits = words.filter((word) => includesPhrase(label, word))
  const digitHits = digits.filter((digit) => includesDigit(label, digit))
  if (!cityHit && wordHits.length === 0) return 0
  let score = (cityHit ? 10 : 0) + wordHits.length * 5 + digitHits.length * 3
  const unmatched = wordHits.length !== words.length || digitHits.length !== digits.length
  if (!unmatched) score += 3
  return score
}

function branchTokens(store: StoreNameRef): { words: string[]; digits: string[] } {
  const name = normalizePhrase(store.name)
  const city = normalizePhrase(store.city)
  const rest = name.replace(city, ' ')
  const words: string[] = []
  const digits: string[] = []
  for (const token of rest.split(' ')) {
    if (!token) continue
    if (/^\d+$/.test(token)) digits.push(token)
    else if (token.length >= 2) words.push(token)
  }
  return { words, digits }
}

function normalizePhrase(input: string): string {
  return input
    .replace(/[\u0591-\u05C7]/g, '')
    .replace(/קריית/g, 'קרית')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

function includesPhrase(hay: string, phrase: string): boolean {
  if (!phrase) return false
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(?:^|[^\\u0590-\\u05FFa-z0-9])${escaped}(?![\\u0590-\\u05FFa-z0-9])`, 'i').test(hay)
}

function includesDigit(hay: string, digit: string): boolean {
  return new RegExp(`(?<!\\d)${digit}(?!\\d)`).test(hay)
}
