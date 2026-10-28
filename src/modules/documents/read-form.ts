import { ISRAEL_STORES } from '@/modules/stores/israel-stores'

export type HearingKind = 'hearing_booth' | 'hearing_meter' | 'hearing_tymp'

export type ReadForm = {
  kind: HearingKind | null
  storeCode: string | null
  storeName: string | null
  expiry: string | null
  calibrationExpiry: string | null
  serial: string | null
  confident: boolean
  reason: string | null
}

const PREFIXES = ['', 'ב', 'ה', 'ו', 'ש', 'מ', 'ל', 'כ', 'שב', 'וה', 'וב', 'בה', 'לה', 'מה']

/** A printed alias that does not match the directory name character for character. */
const ALIAS: Record<string, string[]> = {
  '6004': ['שנקין'],
  '6029': ['קריית שמונה'],
  '6035': ['פתח תקוה'],
  '6038': ['קריית עקרון', 'עקרון', 'בילו'],
  '6043': ['יוקנעם'],
  '6048': ['קריית אתא'],
  '907001': ['מודעין'],
}

/** Words that separate two branches in the same city. */
const EXTRA: Record<string, string[]> = {
  '6001': ['כיכר ציון'],
  '6002': ['תלפיות'],
  '6003': ['גבעת שאול'],
  '6006': ['אבן גבירול', 'גבירול'],
  '6008': ['רמלה'],
  '6013': ['סטאר'],
  '6017': ['מול'],
  '6020': ['מקס'],
  '6022': ['סיטי'],
  '6030': ['עתיר'],
  '6032': ['ניסנבאום'],
  '6033': ['פארק'],
  '6037': ['הרצל'],
  '6041': ['ביג'],
  '6046': ['ויצמן'],
  '6047': ['הסיירים', 'סיירים'],
}

function isHeb(char: string | undefined): boolean {
  return Boolean(char && /[\u0590-\u05FF]/.test(char))
}

/** PDF text often glues a one- or two-letter prefix onto the next word. */
export function phraseAt(text: string, phrase: string): number {
  if (!phrase) return -1
  for (const prefix of PREFIXES) {
    const token = prefix + phrase
    let from = 0
    while (from < text.length) {
      const at = text.indexOf(token, from)
      if (at < 0) break
      const before = at > 0 ? text[at - 1] : ''
      const after = text[at + token.length] ?? ''
      const afterOk = !isHeb(after) && !(/\d$/.test(phrase) && /\d/.test(after))
      if (!isHeb(before) && afterOk) return at
      from = at + token.length
    }
  }
  return -1
}

function hasPhrase(text: string, phrase: string): boolean {
  return phraseAt(text, phrase) >= 0
}

function hasCity(text: string, city: string): boolean {
  if (hasPhrase(text, city)) return true
  const parts = city.split(/\s+/).filter(Boolean)
  if (parts.length < 2) return false
  return hasPhrase(text, [...parts].reverse().join(' '))
}

export function normalizeFormText(raw: string): string {
  let text = raw
    .replaceAll('ð', 'נ')
    .replaceAll('', 'נ')
    .replaceAll('\uF8FF', 'נ')
    .replaceAll('–', '-')
    .replaceAll('־', ' ')
  text = text.replaceAll('יוני נתניהו', '')
  text = text.replaceAll('אופטיל', 'אופטיקל')
  for (const word of ['אופטיקל', 'סנטר', 'סניף', 'מיקום', 'שלכם', 'חוות']) {
    text = text.replaceAll(word, ` ${word} `)
  }
  return text.replace(/\s+/g, ' ').trim()
}

function toIso(raw: string): string | null {
  const match = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
  if (!match) return null
  const day = Number(match[1])
  const month = Number(match[2])
  let year = Number(match[3])
  if (year < 100) year += 2000
  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 2020 || year > 2036) {
    return null
  }
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function dateNear(text: string, label: string): string | null {
  const idx = text.indexOf(label)
  if (idx < 0) return null
  const before = text.slice(Math.max(0, idx - 32), idx)
  const found = [...before.matchAll(/(\d{1,2}\/\d{1,2}\/(?:20)?\d{2})/g)]
  const last = found.at(-1)
  if (last?.[1]) return toIso(last[1])
  const after = text.slice(idx + label.length, idx + label.length + 18)
  const next = after.match(/(\d{1,2}\/\d{1,2}\/(?:20)?\d{2})/)
  return next?.[1] ? toIso(next[1]) : null
}

function calibrationDate(text: string): string | null {
  const labeled = dateNear(text, 'תוקף כיול')
  if (labeled) return labeled
  const glued = text.match(/(\d{1,2}\/\d{1,2}\/(?:20)?\d{2})\s*כיול/)
  return glued?.[1] ? toIso(glued[1]) : null
}

function serialOf(text: string): string | null {
  const labeled = text.match(/S\\?N:\s*(\d{5,})/)
  if (labeled?.[1]) return labeled[1]
  const before = text.match(/(\d{7,8})\s*בעל מספר סידורי/)
  if (before?.[1]) return before[1]
  const after = text.match(/מספר סידורי\s*(\d{7,8})/)
  return after?.[1] ?? null
}

function kindOf(text: string): HearingKind | null {
  if (/חוות דעת|בדיקת התא|תא שמיעה/.test(text)) return 'hearing_booth'
  if (/טימפ|Tymp/i.test(text)) return 'hearing_tymp'
  if (/אודיומטר/.test(text)) return 'hearing_meter'
  return null
}

type Scored = {
  code: string
  name: string
  score: number
  phrases: string[]
}

function scoreStores(text: string): Scored[] {
  const rows: Scored[] = []
  for (const store of ISRAEL_STORES) {
    const phrases: string[] = []
    let score = 0
    const aliases = ALIAS[store.code] ?? []
    if (hasPhrase(text, store.name) || aliases.some((alias) => hasPhrase(text, alias))) {
      score += 100
      phrases.push(store.name)
    } else if (hasCity(text, store.city)) {
      score += 50
      phrases.push(store.city)
    }
    for (const extra of EXTRA[store.code] ?? []) {
      if (hasPhrase(text, extra)) {
        score += 30
        phrases.push(extra)
      }
    }
    if (score > 0) rows.push({ code: store.code, name: store.name, score, phrases })
  }
  return rows.sort((a, b) => b.score - a.score || a.code.localeCompare(b.code))
}

function anchorDistance(text: string, phrases: string[]): number {
  let anchor = -1
  for (const word of ['ממצאי', 'מיקום', 'לכבוד', 'סניף']) {
    const at = text.indexOf(word)
    if (at >= 0) {
      anchor = at
      break
    }
  }
  if (anchor < 0) return Number.POSITIVE_INFINITY
  let best = Number.POSITIVE_INFINITY
  for (const phrase of phrases) {
    const at = phraseAt(text, phrase)
    if (at < 0) continue
    best = Math.min(best, Math.abs(at - anchor))
  }
  return best
}

function chooseStore(text: string): { code: string; name: string } | null {
  const scored = scoreStores(text)
  const best = scored[0]
  if (!best || best.score < 80) return null
  const next = scored[1]
  if (!next || best.score >= next.score + 20) return { code: best.code, name: best.name }
  const tied = scored.filter((row) => row.score >= best.score - 10 && row.score >= 80)
  const marks = (row: Scored) => {
    const hints = [...(EXTRA[row.code] ?? []), ...(ALIAS[row.code] ?? [])]
    const hit = row.phrases.filter((phrase) => hints.includes(phrase))
    return hit.length ? hit : row.phrases
  }
  const ranked = [...tied].sort(
    (a, b) => anchorDistance(text, marks(a)) - anchorDistance(text, marks(b)),
  )
  const winner = ranked[0]
  const runner = ranked[1]
  if (!winner || !runner) return winner ? { code: winner.code, name: winner.name } : null
  if (anchorDistance(text, marks(winner)) === anchorDistance(text, marks(runner))) return null
  return { code: winner.code, name: winner.name }
}

export function readHearingForm(raw: string): ReadForm {
  const text = normalizeFormText(raw)
  const kind = kindOf(text)
  const store = chooseStore(text)
  const expiry =
    kind === 'hearing_booth'
      ? (dateNear(text, 'תוקף בדיקת התא') ?? dateNear(text, 'תוקף הבדיקה'))
      : dateNear(text, 'תוקף הבדיקה')
  const calibrationExpiry = kind === 'hearing_booth' ? calibrationDate(text) : null
  const serial = serialOf(text)
  const candidates = scoreStores(text)
    .filter((row) => row.score >= 50)
    .slice(0, 2)
    .map((row) => row.name)
    .join(' או ')
  let reason: string | null = null
  if (!kind) reason = 'סוג הקובץ לא זוהה'
  else if (!store) {
    reason = candidates ? `השיוך לסניף לא ודאי · ${candidates}` : 'השיוך לסניף לא ודאי'
  } else if (!expiry) reason = 'תאריך התוקף לא ברור'
  return {
    kind,
    storeCode: store?.code ?? null,
    storeName: store?.name ?? null,
    expiry,
    calibrationExpiry: calibrationExpiry && calibrationExpiry !== expiry ? calibrationExpiry : null,
    serial,
    confident: Boolean(kind && store && expiry),
    reason,
  }
}
