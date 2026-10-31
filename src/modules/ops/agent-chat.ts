import { hydrateOpsLedger } from '@/lib/data/ops-db'
import { listDocuments, listOutcomes, listSpends, spendsForAsset } from '@/lib/data/ops-ledger'
import { documentDueAt, documentTypeLabel, type StoreDocument } from '@/modules/documents/rules'
import { listAssets } from '@/modules/assets/service'
import { recordedCategoryBands } from '@/modules/recommendations/estimate'
import { formatIls, sumTrueCost } from '@/modules/spend/true-cost'
import { pilotMoney } from '@/modules/pilot/value'
import { plainStatus } from '@/components/ops/plain-labels'
import { ticketDecision } from '@/modules/decisions/queue'
import { isBreached } from '@/modules/tickets/queue'
import { hasAiGatewayAuth, resolveReplyModel } from '@/modules/whatsapp/ai-sdk/models'
import { generateText } from 'ai'
import type { Actor } from '@/lib/auth/types'
import { scopeTicketsForActor } from '@/lib/auth/ticket-scope'
import { listProfessionals } from '@/modules/professionals/service'
import { OPEN_TICKET_STATUSES } from '@/modules/tickets/constants'
import { listTickets } from '@/modules/tickets/service'
import { actForAri } from '@/modules/ops/agent-actions'
import {
  recommendBundles,
  type BundleCard,
  type BundleFault,
} from '@/modules/whatsapp/agent/bundle'
import type { Locale } from '@/lib/i18n/locale'

export type ChatTurn = { role: 'user' | 'assistant'; text: string }

export type SnapshotFault = {
  id: string
  storeName: string
  category: string
  summary: string
  displayNumber: string | null
  priority?: string
  overdue?: boolean
  assigned?: boolean
  statusLabel?: string
  /** The one move Ari can take on this fault. */
  verb?: string
}

export type PriceBand = {
  category: string
  low: number
  high: number
}

export type DuePaper = {
  storeName: string
  label: string
  overdue: boolean
}

export type RepeatGear = {
  storeName: string
  name: string
  times: number
  openSummary: string | null
  /** Recorded spend on this asset. Absent when nothing was priced. */
  cost: number | null
}

export type GearAsset = {
  id: string
  name: string
  storeId: string
  storeName: string
}

export type GearTicket = {
  id: string
  assetId: string | null
  storeId: string
  storeName: string
  summary: string
  createdAt: string
  status: string
}

export type OpsSnapshot = {
  open: SnapshotFault[]
  cards: BundleCard[]
  bands?: PriceBand[]
  money?: { waiting: number; approved: number; paid: number }
  papers?: DuePaper[]
  gear?: RepeatGear[]
}

const PAPER_SOON_MS = 30 * 24 * 60 * 60 * 1000
const GEAR_WINDOW_MS = 180 * 24 * 60 * 60 * 1000

/** Dated documents that are already late, or due within a month. */
export function duePapersFrom(docs: StoreDocument[], now = new Date()): DuePaper[] {
  const rows: DuePaper[] = []
  for (const doc of docs) {
    if (doc.renewed || doc.intakeStatus === 'failed') continue
    const due = documentDueAt(doc)
    if (!due) continue
    const dueMs = new Date(due).getTime()
    if (Number.isNaN(dueMs)) continue
    const late = dueMs < now.getTime()
    const soon = !late && dueMs - now.getTime() <= PAPER_SOON_MS
    if (!late && !soon) continue
    rows.push({
      storeName: doc.storeName,
      label: documentTypeLabel(doc.docType),
      overdue: late,
    })
  }
  return rows.sort(
    (a, b) => Number(b.overdue) - Number(a.overdue) || a.storeName.localeCompare(b.storeName, 'he'),
  )
}

/**
 * An asset counts when two or more faults in the last 180 days point at it,
 * by id or by its name in the report. Cost is included only from recorded spends.
 */
export function repeatGearFrom(
  assets: GearAsset[],
  tickets: GearTicket[],
  costByAsset: Record<string, number>,
  now = new Date(),
): RepeatGear[] {
  const from = now.getTime() - GEAR_WINDOW_MS
  const open = new Set<string>(OPEN_TICKET_STATUSES)
  const recent = tickets.filter((ticket) => {
    if (ticket.status === 'cancelled') return false
    const ms = new Date(ticket.createdAt).getTime()
    return !Number.isNaN(ms) && ms >= from
  })
  const rows: RepeatGear[] = []
  for (const asset of assets) {
    const name = asset.name.trim()
    const ids = new Set<string>()
    for (const ticket of recent) {
      if (ticket.assetId === asset.id) ids.add(ticket.id)
    }
    if (name.length >= 3) {
      for (const ticket of recent) {
        if (ids.has(ticket.id) || ticket.storeId !== asset.storeId) continue
        if (ticket.assetId && ticket.assetId !== asset.id) continue
        if (ticket.summary.includes(name)) ids.add(ticket.id)
      }
    }
    if (ids.size < 2) continue
    const mine = recent.filter((ticket) => ids.has(ticket.id))
    const current = mine.find((ticket) => open.has(ticket.status))
    const cost = costByAsset[asset.id]
    rows.push({
      storeName: asset.storeName || mine[0]?.storeName || 'סניף',
      name,
      times: ids.size,
      openSummary: current?.summary ?? null,
      cost: cost != null && cost > 0 ? cost : null,
    })
  }
  return rows.sort((a, b) => b.times - a.times || a.name.localeCompare(b.name, 'he'))
}

export function answerFromSnapshot(
  question: string,
  snapshot: OpsSnapshot,
  locale: Locale = 'he',
  history: ChatTurn[] = [],
): string {
  if (locale === 'he') return answerAri(question, snapshot, history)
  const q = question.trim()
  const open = snapshot.open
  const cards = snapshot.cards
  if (!q) return intro(snapshot, locale)

  if (/מה אתה|מי אתה|מה את יודע|מה אתה יודע|מה את יודעת|who are you|what do you know|qui es-tu|que sais-tu/i.test(q)) {
    return intro(snapshot, locale)
  }

  const storeHits = storesInQuestion(q, open, cards)
  const category = categoryInQuestion(q)

  if (/יעלה|מחיר|טווח|הערכ|how much|price range|prix|fourchette|combien ça/i.test(q)) {
    return speakRange(snapshot, locale, category, storeHits)
  }

  const namedPlace = placeInQuestion(q, snapshot)
  if (/document|certificat|calibration|expir|échéance/i.test(q)) {
    return papersLine(snapshot, locale, namedPlace, true)
  }
  if (/equipment|asset|repeat|équipement|pièce|appareil/i.test(q)) {
    return gearLine(snapshot, locale, namedPlace, true)
  }

  if (
    /לאחד|איגוד|ביקור אחד|המלצ|מה לעשות|מה דחוף|combin|bundle|one visit|recommend|regroup|une visite|recommand/i.test(
      q,
    )
  ) {
    const relevant = storeHits.length
      ? cards.filter((card) => storeHits.includes(card.storeName))
      : cards
    if (relevant.length === 0) {
      return open.length === 0 ? copy(locale).nothingToCombine : copy(locale).noBundleYet(open.length)
    }
    return relevant
      .slice(0, 3)
      .map((card) => speakCard(card, locale))
      .join('\n')
  }

  if (storeHits.length > 0) {
    const rows = open.filter((fault) => storeHits.includes(fault.storeName))
    const storeCards = cards.filter((card) => storeHits.includes(card.storeName))
    const lines = rows.slice(0, 6).map((fault) => faultLine(fault))
    const extra = storeCards[0] ? `\n${speakCard(storeCards[0], locale)}` : ''
    const aside = [papersLine(snapshot, locale, storeHits[0]), gearLine(snapshot, locale, storeHits[0])]
      .filter(Boolean)
      .join('\n')
    if (rows.length === 0 && storeCards.length === 0 && !aside) {
      return copy(locale).storeMissing
    }
    return `${storeHits[0]}: ${copy(locale).storeCount(rows.length)}\n${lines.join('\n')}${extra}${aside ? `\n${aside}` : ''}`.trim()
  }

  if (category) {
    const rows = open.filter((fault) => fault.category === category)
    const label = categoryLabel(category, locale)
    if (rows.length === 0) return copy(locale).noCategory(label)
    return `${copy(locale).categoryCount(rows.length, label)}\n${rows
      .slice(0, 6)
      .map((fault) => faultLine(fault))
      .join('\n')}`
  }

  if (/כמה|פתוח|סטטוס|מה המצב|מה יש|how many|what'?s open|what is open|status|ouvert|combien|qu[’']est-ce qui est ouvert/i.test(q) || open.length === 0) {
    return intro(snapshot, locale)
  }

  return `${intro(snapshot, locale)}\n${copy(locale).askMore}`
}

export async function loadOpsSnapshot(actor: Actor | null, locale: Locale = 'he'): Promise<OpsSnapshot> {
  await hydrateOpsLedger()
  const [listed, pros, assetResult, history] = await Promise.all([
    listTickets({ limit: 150, statuses: [...OPEN_TICKET_STATUSES] }).catch(() => ({
      tickets: [],
    })),
    listProfessionals({ limit: 80 }).catch(() => ({ professionals: [] })),
    listAssets().catch(() => ({ assets: [] })),
    listTickets({ limit: 200 }).catch(() => ({ tickets: [] })),
  ])
  const tickets = actor ? scopeTicketsForActor(actor, listed.tickets) : listed.tickets
  const historyTickets = actor ? scopeTicketsForActor(actor, history.tickets) : history.tickets
  const openFaults: BundleFault[] = tickets.map((ticket) => ({
    id: ticket.id,
    storeId: ticket.store_id,
    storeName: ticket.stores?.name || ticket.stores?.code || 'סניף',
    category: ticket.category || 'other',
    priority: ticket.priority,
    status: ticket.status,
    summary: ticket.title || ticket.description,
    createdAt: ticket.created_at,
    slaResolveBy: ticket.sla_resolve_by,
    resolvedAt: ticket.resolved_at,
    firstResponseAt: ticket.first_response_at,
    dispatched: ticket.status === 'waiting_vendor',
  }))
  const cards = recommendBundles({
    open: openFaults,
    outcomes: listOutcomes(),
    professionals: pros.professionals.map((pro) => ({
      id: pro.id,
      full_name: pro.full_name,
      phone: pro.phone,
      trade: pro.trade,
      notes: pro.notes,
      use_count: pro.use_count,
    })),
  })
  const categoryByTicketId: Record<string, string> = {}
  for (const ticket of tickets) {
    if (ticket.id) categoryByTicketId[ticket.id] = ticket.category || 'other'
  }
  const spends = listSpends()
  const bands = recordedCategoryBands({
    outcomes: listOutcomes(),
    spends,
    categoryByTicketId,
  })
  const money = pilotMoney(spends, [])
  const now = new Date()
  return {
    open: openFaults.map((fault) => {
      const ticket = tickets.find((row) => row.id === fault.id)
      const decision = ticket ? ticketDecision(ticket, now, locale) : null
      const verb = decision?.action.split('·')[0]?.trim()
      return {
        id: fault.id,
        storeName: fault.storeName,
        category: fault.category,
        summary: fault.summary,
        displayNumber: ticket?.display_number ?? null,
        priority: fault.priority,
        overdue: ticket ? isBreached(ticket, now) : false,
        assigned: ticket ? Boolean(ticket.assigned_to) : undefined,
        verb: verb || (ticket?.assigned_to ? 'לטפל' : 'לשייך'),
        statusLabel: ticket ? plainStatus(ticket.status, locale) : undefined,
      }
    }),
    cards,
    bands,
    money: {
      waiting: money.waiting,
      approved: money.approved,
      paid: money.paid,
    },
    papers: duePapersFrom(listDocuments(), now),
    gear: repeatGearFrom(
      assetResult.assets.map((asset) => ({
        id: asset.id,
        name: asset.name,
        storeId: asset.store_id,
        storeName: asset.store_name || '',
      })),
      historyTickets.map((ticket) => ({
        id: ticket.id,
        assetId: ticket.asset_id ?? null,
        storeId: ticket.store_id,
        storeName: ticket.stores?.name || ticket.stores?.code || 'סניף',
        summary: ticket.title || ticket.description,
        createdAt: ticket.created_at,
        status: ticket.status,
      })),
      Object.fromEntries(
        assetResult.assets.map((asset) => [asset.id, sumTrueCost(spendsForAsset(asset.id))]),
      ),
      now,
    ),
  }
}

export async function replyToAri(input: {
  message: string
  history?: ChatTurn[]
  actor: Actor | null
  locale?: Locale
  source?: 'web_fallback' | 'whatsapp'
}): Promise<{ reply: string; links: { href: string; label: string }[] }> {
  const locale = input.locale ?? 'he'
  const snapshot = await loadOpsSnapshot(input.actor, locale)
  if (locale === 'he') {
    const acted = await actForAri({
      message: input.message,
      history: input.history,
      open: snapshot.open.map((fault) => ({
        id: fault.id,
        storeName: fault.storeName,
        summary: fault.summary,
        displayNumber: fault.displayNumber ?? null,
      })),
      source: input.source ?? 'web_fallback',
    })
    if (acted) return acted
  }
  if (asksPapersOrGear(input.message)) {
    return {
      reply: answerFromSnapshot(input.message, snapshot, locale, input.history ?? []),
      links: [],
    }
  }
  const modeled = await tryModelReply(input.message, snapshot, input.history ?? [], locale)
  if (modeled) return { reply: modeled, links: [] }
  return { reply: answerFromSnapshot(input.message, snapshot, locale, input.history ?? []), links: [] }
}

function asksPapersOrGear(message: string): boolean {
  return /מסמך|כיול|תוקף|תעודה|כיבוי אש|ציוד|חלקים|חוזר|חזר|מכשיר|document|certificat|calibration|expir|échéance|equipment|asset|repeat|équipement|pièce|appareil/i.test(
    message,
  )
}

const ARI_SYSTEM = `אתה העוזר האישי של ארי, מנהל התפעול של הרשת.
כבר הסתכלת על העובדות למטה. ענה בעברית, קצר, עם שם הסניף והצעד הבא.
השתמש רק בעובדות האלה. אל תמציא מחיר, ספק, או תקלה.
מסמך באיחור וציוד שחזר כלולים בעובדות. מחיר של ציוד רק אם הוא רשום שם.
אל תשלח אותו למסך אחר. אל תגיד שאתה כאן כדי שיישאר.`

async function tryModelReply(
  question: string,
  snapshot: OpsSnapshot,
  history: ChatTurn[],
  locale: Locale,
): Promise<string | null> {
  if (locale !== 'he' || !hasAiGatewayAuth()) return null
  const resolved = await resolveReplyModel()
  if (!resolved) return null
  const prior = history
    .slice(-6)
    .map((turn) => `${turn.role === 'user' ? 'ארי' : 'עוזר'}: ${turn.text}`)
    .join('\n')
  try {
    const { text } = await generateText({
      model: resolved.model,
      system: ARI_SYSTEM,
      prompt: `${briefForAri(snapshot)}\n${prior ? `שיחה:\n${prior}\n` : ''}ארי: ${question}`,
      temperature: 0.3,
      abortSignal: AbortSignal.timeout(12_000),
    })
    const reply = text.trim()
    return reply || null
  } catch {
    return null
  }
}

function answerAri(question: string, snapshot: OpsSnapshot, history: ChatTurn[]): string {
  const q = question.trim()
  const stores = storePictures(snapshot)
  if (!q || stores.length === 0) {
    if (stores.length === 0) {
      const aside = [papersLine(snapshot, 'he'), gearLine(snapshot, 'he')].filter(Boolean).join('\n')
      return aside || 'אין תקלות פתוחות. הכל שקט.'
    }
    return openingAri(snapshot, stores)
  }
  if (/(?:יכול|יודע|אפשר).*(?:משימ|תקלה)|(?:משימ|תקלה).*(?:יכול|יודע|אפשר)/.test(q)) {
    return 'אפשר. «תפתח תקלה ב…» עם מה שקרה, או «תפתח משימה …». אם כבר דיברנו על סניף, «תפתח על זה משימה» מספיק.'
  }
  if (/יעלה|מחיר|טווח|הערכ/i.test(q)) {
    return speakRange(snapshot, 'he', categoryInQuestion(q), namedStoreNames(q, stores))
  }
  const named = namedStores(q, stores)
  const place = placeInQuestion(q, snapshot) ?? named[0]?.name
  if (/מסמך|כיול|תוקף|תעודה|כיבוי אש/.test(q)) {
    return papersLine(snapshot, 'he', place, true)
  }
  if (/ציוד|חלקים|חוזר|חזר|מכשיר/.test(q)) {
    return gearLine(snapshot, 'he', place, true)
  }
  if (/מחכה|אושר|שולם|כסף|רשום/i.test(q) && named.length === 0) {
    return moneyAri(snapshot)
  }
  if (/לאחד|איגוד|ביקור אחד|המלצ|מה כדאי|כדאי לאחד/i.test(q)) {
    return bundleAri(named.length ? named : stores)
  }
  if (/הכי (בעיית|דחוף|חמור|גרוע)|איזה סניף|מאיפה להתחיל|מה קודם/i.test(q)) {
    return detailAri(named[0] ?? stores[0]!, snapshot)
  }
  if (named.length > 0) return detailAri(named[0]!, snapshot)
  const remembered = lastMentioned(history.map((turn) => turn.text).join('\n'), stores)
  if (/עוד|יותר|תפרט|ספר|אותו|על זה|למה/i.test(q) && remembered) {
    return detailAri(remembered, snapshot)
  }
  if (/חורג|איחור|באיחור/i.test(q)) return listAri(stores, (fault) => Boolean(fault.overdue), 'חורגות')
  if (/לא משויך|בלי שיוך|מי משויך/i.test(q)) {
    return listAri(stores, (fault) => fault.assigned === false, 'בלי שיוך')
  }
  const category = categoryInQuestion(q)
  if (category) {
    const rows = snapshot.open.filter((fault) => fault.category === category)
    const label = categoryLabel(category, 'he')
    if (rows.length === 0) return `אין עכשיו ${label}.`
    return `${rows.length} ${label}.\n${rows.slice(0, 4).map(faultSentence).join('\n')}`
  }
  return openingAri(snapshot, stores)
}

function openingAri(snapshot: OpsSnapshot, stores: StorePicture[]): string {
  const top = stores[0]
  if (!top) return 'אין תקלות פתוחות. הכל שקט.'
  const why =
    top.overdue > 1
      ? `${top.overdue} תקלות שם כבר חורגות.`
      : top.overdue === 1
        ? 'אחת שם כבר חורגת.'
        : top.unassigned > 0
          ? 'יש שם תקלה שעדיין בלי שיוך.'
          : top.faults.length === 1
            ? 'תקלה פתוחה אחת.'
            : `${top.faults.length} תקלות פתוחות.`
  const next = top.lead.verb ? `הצעד הוא ${top.lead.verb}.` : ''
  const paper = (snapshot.papers ?? []).find((row) => row.storeName === top.name && row.overdue)
  const gear = (snapshot.gear ?? []).find((row) => row.storeName === top.name)
  const aside = paper
    ? `${paper.label} שם כבר באיחור.`
    : gear
      ? `על ${gear.name} שם כבר ${gear.times} תקלות.`
      : ''
  return [`ארי, ${top.name} דורש אותך: ${top.lead.summary}.`, why, next, aside, moneyAri(snapshot, true)]
    .filter(Boolean)
    .join(' ')
}

function detailAri(store: StorePicture, snapshot: OpsSnapshot): string {
  const lines = store.faults.slice(0, 4).map(faultSentence)
  const more = store.faults.length > 4 ? `\nועוד ${store.faults.length - 4}.` : ''
  const visit = store.card?.sentence ? `\n${store.card.sentence}` : ''
  const cost =
    store.card?.costLine && store.card.costLine !== 'אין עדיין מחיר'
      ? `\n${store.card.costLine}`
      : ''
  const aside = [papersLine(snapshot, 'he', store.name), gearLine(snapshot, 'he', store.name)]
    .filter(Boolean)
    .join('\n')
  return `${store.name}.\n${lines.join('\n')}${more}${visit}${cost}${aside ? `\n${aside}` : ''}`
}

function moneyAri(snapshot: OpsSnapshot, quiet = false): string {
  const money = snapshot.money
  if (!money || (money.waiting === 0 && money.approved === 0 && money.paid === 0)) {
    return quiet ? '' : 'אין כרגע סכום שמחכה לאישור.'
  }
  const paid = money.paid > 0 ? ` שולם ${formatIls(money.paid)}.` : ''
  return `מחכים לאישור ${formatIls(money.waiting)}. כבר אושר ${formatIls(money.approved)}.${paid}`
}

function bundleAri(stores: StorePicture[]): string {
  const cards = stores.map((store) => store.card).filter((card): card is BundleCard => Boolean(card))
  if (cards.length === 0) {
    const open = stores.reduce((sum, store) => sum + store.faults.length, 0)
    return open === 0
      ? 'אין תקלות פתוחות, ואין מה לאחד.'
      : `יש ${open} תקלות פתוחות, ועדיין אין חבילה לאדם אחד. דחוף מטופל מיד, בלי לחכות.`
  }
  return cards
    .slice(0, 3)
    .map((card) => withCost(card.sentence, card.costLine))
    .join('\n')
}

function listAri(
  stores: StorePicture[],
  keep: (fault: SnapshotFault) => boolean,
  label: string,
): string {
  const faults = stores.flatMap((store) => store.faults).filter(keep)
  if (faults.length === 0) return `אין עכשיו תקלות ${label}.`
  return `${faults.length} ${label}.\n${faults.slice(0, 5).map(faultSentence).join('\n')}`
}

function faultSentence(fault: SnapshotFault): string {
  const number = fault.displayNumber ? `${fault.displayNumber}: ` : ''
  const marks = [
    fault.overdue ? 'חורגת' : null,
    fault.assigned === false ? 'לא משויכת' : fault.statusLabel ?? null,
    fault.verb ?? null,
  ].filter(Boolean)
  const tail = marks.length ? ` ${marks.join(', ')}.` : ''
  return `${number}${fault.summary}.${tail}`
}

type StorePicture = {
  name: string
  faults: SnapshotFault[]
  overdue: number
  unassigned: number
  severe: number
  lead: SnapshotFault
  card: BundleCard | null
}

function storePictures(snapshot: OpsSnapshot): StorePicture[] {
  const byName = new Map<string, SnapshotFault[]>()
  for (const fault of snapshot.open) {
    const list = byName.get(fault.storeName) ?? []
    list.push(fault)
    byName.set(fault.storeName, list)
  }
  return [...byName.entries()]
    .map(([name, faults]) => {
      const ranked = [...faults].sort(compareFaults)
      return {
        name,
        faults: ranked,
        overdue: faults.filter((fault) => fault.overdue).length,
        unassigned: faults.filter((fault) => fault.assigned === false).length,
        severe: faults.filter((fault) => fault.priority === 'critical' || fault.priority === 'high').length,
        lead: ranked[0]!,
        card: snapshot.cards.find((card) => card.storeName === name) ?? null,
      }
    })
    .sort(
      (a, b) =>
        b.overdue - a.overdue ||
        b.severe - a.severe ||
        b.unassigned - a.unassigned ||
        b.faults.length - a.faults.length ||
        a.name.localeCompare(b.name, 'he'),
    )
}

function compareFaults(a: SnapshotFault, b: SnapshotFault): number {
  const late = Number(Boolean(b.overdue)) - Number(Boolean(a.overdue))
  if (late !== 0) return late
  const rank = (priority?: string) =>
    priority === 'critical' ? 0 : priority === 'high' ? 1 : priority === 'medium' ? 2 : 3
  const urgency = rank(a.priority) - rank(b.priority)
  if (urgency !== 0) return urgency
  return Number(a.assigned !== false) - Number(b.assigned !== false)
}

function namedStores(text: string, stores: StorePicture[]): StorePicture[] {
  return stores.filter((store) => storeMentioned(text, store.name))
}

function namedStoreNames(text: string, stores: StorePicture[]): string[] {
  return namedStores(text, stores).map((store) => store.name)
}

function lastMentioned(text: string, stores: StorePicture[]): StorePicture | null {
  let best: { index: number; store: StorePicture } | null = null
  for (const store of stores) {
    const parts = [store.name, ...store.name.split(/\s+/)].filter((part) => part.length >= 4)
    for (const part of parts) {
      const index = text.lastIndexOf(part)
      if (index >= 0 && (!best || index > best.index)) best = { index, store }
    }
  }
  return best?.store ?? null
}

function storeMentioned(text: string, name: string): boolean {
  if (name.length >= 2 && text.includes(name)) return true
  return name
    .split(/\s+/)
    .filter((part) => part.length >= 4)
    .some((part) => text.includes(part))
}

function briefForAri(snapshot: OpsSnapshot): string {
  const stores = storePictures(snapshot)
  const lines = stores.slice(0, 8).map((store) => {
    const faults = store.faults
      .slice(0, 4)
      .map((fault) => faultSentence(fault))
      .join(' | ')
    return `${store.name}: ${faults}`
  })
  const aside = [papersLine(snapshot, 'he'), gearLine(snapshot, 'he')].filter(Boolean)
  return ['עובדות:', moneyAri(snapshot) || 'אין סכום שמחכה.', ...lines, ...aside].join('\n')
}

function placeInQuestion(question: string, snapshot: OpsSnapshot): string | null {
  const names = new Set<string>()
  for (const fault of snapshot.open) names.add(fault.storeName)
  for (const card of snapshot.cards) names.add(card.storeName)
  for (const paper of snapshot.papers ?? []) names.add(paper.storeName)
  for (const row of snapshot.gear ?? []) names.add(row.storeName)
  return [...names].find((name) => name.length >= 2 && question.includes(name)) ?? null
}

function papersLine(
  snapshot: OpsSnapshot,
  locale: Locale,
  storeName?: string,
  required = false,
): string {
  const text = copy(locale)
  let rows = snapshot.papers ?? []
  if (storeName) rows = rows.filter((row) => row.storeName === storeName)
  if (rows.length === 0) return required ? text.noPapers(storeName) : ''
  const shown = rows.slice(0, 5)
  const lines = shown.map((row) =>
    row.overdue ? text.paperLate(row.label, row.storeName) : text.paperSoon(row.label, row.storeName),
  )
  if (rows.length > shown.length) lines.push(text.more(rows.length - shown.length))
  return lines.join('\n')
}

function gearLine(
  snapshot: OpsSnapshot,
  locale: Locale,
  storeName?: string,
  required = false,
): string {
  const text = copy(locale)
  let rows = snapshot.gear ?? []
  if (storeName) rows = rows.filter((row) => row.storeName === storeName)
  if (rows.length === 0) return required ? text.noGear(storeName) : ''
  const shown = rows.slice(0, 4)
  const lines = shown.map((row) =>
    text.gearFact(row.name, row.storeName, row.times, row.openSummary, row.cost),
  )
  if (rows.length > shown.length) lines.push(text.more(rows.length - shown.length))
  return lines.join('\n')
}

function intro(snapshot: OpsSnapshot, locale: Locale): string {
  const text = copy(locale)
  if (snapshot.open.length === 0) {
    const aside = [papersLine(snapshot, locale), gearLine(snapshot, locale)].filter(Boolean).join('\n')
    return aside || text.quiet
  }
  const byStore = new Map<string, number>()
  for (const fault of snapshot.open) {
    byStore.set(fault.storeName, (byStore.get(fault.storeName) ?? 0) + 1)
  }
  const stores = [...byStore.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name, count]) => `${name} ${count}`)
    .join(', ')
  const lead = snapshot.cards[0] ? speakCard(snapshot.cards[0], locale) : null
  return lead
    ? text.withLead(snapshot.open.length, stores, lead)
    : text.openOnly(snapshot.open.length, stores)
}

function faultLine(fault: SnapshotFault): string {
  const number = fault.displayNumber ? `${fault.displayNumber} · ` : ''
  const summary = fault.summary.length > 80 ? `${fault.summary.slice(0, 77)}…` : fault.summary
  return `${number}${fault.storeName}: ${summary}`
}

function storesInQuestion(question: string, open: SnapshotFault[], cards: BundleCard[]): string[] {
  const names = new Set<string>()
  for (const fault of open) names.add(fault.storeName)
  for (const card of cards) names.add(card.storeName)
  return [...names].filter((name) => name.length >= 2 && question.includes(name))
}

function categoryInQuestion(question: string): string | null {
  if (/נזיל|אינסטל|ברז|כיור|leak|plumb|fuite|plomb/i.test(question)) return 'plumbing'
  if (/מזגן|מיזוג|קירור|hvac|air con|clim/i.test(question)) return 'hvac'
  if (/חשמל|electric|électr/i.test(question)) return 'electrical'
  if (/מנעול|אבטחה|דלת|lock|security|serrure/i.test(question)) return 'security'
  if (/קופה|מחשב|רשת|\bit\b|computer|caisse|informatique/i.test(question)) return 'it'
  if (/ניקיון|clean|nettoyage/i.test(question)) return 'cleaning'
  return null
}

const NOUN: Record<Locale, Record<string, string>> = {
  he: {
    plumbing: 'נזילות',
    hvac: 'תקלות מיזוג',
    electrical: 'תקלות חשמל',
    security: 'תקלות אבטחה',
    it: 'תקלות מחשוב',
    cleaning: 'עבודות ניקיון',
    other: 'תקלות',
  },
  en: {
    plumbing: 'leaks',
    hvac: 'HVAC faults',
    electrical: 'electrical faults',
    security: 'security faults',
    it: 'IT faults',
    cleaning: 'cleaning jobs',
    other: 'faults',
  },
  fr: {
    plumbing: 'fuites',
    hvac: 'pannes de climatisation',
    electrical: 'pannes électriques',
    security: 'pannes de sécurité',
    it: 'pannes informatiques',
    cleaning: 'travaux de nettoyage',
    other: 'pannes',
  },
}

function categoryLabel(category: string, locale: Locale): string {
  return NOUN[locale][category] ?? NOUN[locale].other ?? category
}

function speakCard(card: BundleCard, locale: Locale): string {
  if (locale === 'he') return withCost(card.sentence, card.costLine)
  const count = card.ticketIds.length
  const noun = categoryLabel(card.category, locale)
  const store = card.storeName
  if (card.kind === 'urgent') {
    return locale === 'fr'
      ? `À traiter maintenant au magasin ${store}. On n'attend pas d'autres pannes.`
      : `Handle ${store} now. Don't wait for more faults.`
  }
  if (card.kind === 'prevention') {
    return locale === 'fr'
      ? `La panne est revenue au magasin ${store}. Mieux vaut un contrôle qu'une nouvelle intervention.`
      : `This fault came back at ${store}. A check is better than another call-out.`
  }
  const sentence = card.professionalName
    ? locale === 'fr'
      ? `${count} ${noun} au magasin ${store}. ${card.professionalName} peut tout traiter en une visite.`
      : `${count} ${noun} at ${store}. ${card.professionalName} can handle them in one visit.`
    : locale === 'fr'
      ? `${count} ${noun} au magasin ${store}. Aucun professionnel enregistré.`
      : `${count} ${noun} at ${store}. No professional on file.`
  return withCost(sentence, card.costLine)
}

function withCost(sentence: string, costLine: string | null): string {
  if (!costLine || costLine === 'אין עדיין מחיר') return sentence
  return `${sentence}\n${costLine}`
}

function speakRange(
  snapshot: OpsSnapshot,
  locale: Locale,
  category: string | null,
  storeHits: string[],
): string {
  const text = copy(locale)
  let bands = snapshot.bands ?? []
  if (category) bands = bands.filter((band) => band.category === category)
  else if (storeHits.length > 0) {
    const openHere = new Set(
      snapshot.open.filter((fault) => storeHits.includes(fault.storeName)).map((fault) => fault.category),
    )
    bands = bands.filter((band) => openHere.has(band.category))
  }
  if (bands.length === 0) return text.noRange
  const lines = bands.map((band) => {
    const label = categoryLabel(band.category, locale)
    const money =
      band.low === band.high
        ? text.onePrice(band.low)
        : text.span(band.low, band.high)
    return `${label}: ${money}`
  })
  return `${text.rangeLead}\n${lines.join('\n')}`
}

function copy(locale: Locale) {
  if (locale === 'en') {
    return {
      quiet: 'Nothing is open. All quiet.',
      noPapers: (store?: string) =>
        store ? `No document is overdue at ${store}.` : 'No document is overdue or due this month.',
      noGear: (store?: string) =>
        store ? `No equipment is repeating at ${store}.` : 'No equipment is repeating.',
      paperLate: (label: string, store: string) => `${label} at ${store} is already overdue.`,
      paperSoon: (label: string, store: string) => `${label} at ${store} is due within a month.`,
      gearFact: (name: string, store: string, times: number, open: string | null, cost: number | null) =>
        `${name} at ${store} — ${times} faults.${open ? ` Now: ${open}.` : ''}${cost != null ? ` ${formatIls(cost)} is already recorded on it.` : ''}`,
      more: (count: number) => `And ${count} more.`,
      nothingToCombine: 'Nothing is open, and there is nothing to combine.',
      noBundleYet: (count: number) =>
        `There are ${count} open faults, and nothing to combine yet. Urgent faults are handled now.`,
      storeMissing: 'I do not see that store in the open faults.',
      storeCount: (count: number) => `${count} open`,
      noCategory: (label: string) => `No open ${label}.`,
      categoryCount: (count: number, label: string) => `${count} ${label}:`,
      askMore: 'Ask about a store name, what to combine, or the price range.',
      noRange: 'Nothing has been recorded yet, so there is no range.',
      rangeLead: 'The range is the lowest and highest price already recorded for that fault type.',
      onePrice: (amount: number) => `one recorded price, ${formatIls(amount)}`,
      span: (low: number, high: number) => `${formatIls(low)}–${formatIls(high)}`,
      withLead: (count: number, stores: string, lead: string) =>
        `${count} open (${stores}). ${lead}`,
      openOnly: (count: number, stores: string) =>
        `${count} open (${stores}). Nothing to combine into one visit yet.`,
    }
  }
  if (locale === 'fr') {
    return {
      quiet: 'Aucune panne ouverte. Tout est calme.',
      noPapers: (store?: string) =>
        store
          ? `Aucun document en retard au magasin ${store}.`
          : 'Aucun document en retard ou à échéance ce mois-ci.',
      noGear: (store?: string) =>
        store ? `Aucun équipement ne revient au magasin ${store}.` : 'Aucun équipement ne revient.',
      paperLate: (label: string, store: string) => `${label} au magasin ${store} est déjà en retard.`,
      paperSoon: (label: string, store: string) =>
        `${label} au magasin ${store} arrive à échéance dans moins d'un mois.`,
      gearFact: (name: string, store: string, times: number, open: string | null, cost: number | null) =>
        `${name} au magasin ${store} — ${times} pannes.${open ? ` Maintenant : ${open}.` : ''}${cost != null ? ` ${formatIls(cost)} est déjà enregistré.` : ''}`,
      more: (count: number) => `Et ${count} de plus.`,
      nothingToCombine: 'Aucune panne ouverte, et rien à regrouper.',
      noBundleYet: (count: number) =>
        `Il y a ${count} pannes ouvertes, et rien à regrouper pour l'instant. L'urgent est traité tout de suite.`,
      storeMissing: 'Je ne vois pas ce magasin dans les pannes ouvertes.',
      storeCount: (count: number) => `${count} ouvertes`,
      noCategory: (label: string) => `Aucune panne ouverte : ${label}.`,
      categoryCount: (count: number, label: string) => `${count} ${label} :`,
      askMore: 'Demandez un magasin, ce qu’il faut regrouper, ou la fourchette de prix.',
      noRange: 'Aucun prix enregistré, donc pas de fourchette.',
      rangeLead: 'La fourchette est le prix le plus bas et le plus haut déjà enregistrés pour ce type de panne.',
      onePrice: (amount: number) => `un prix enregistré, ${formatIls(amount)}`,
      span: (low: number, high: number) => `${formatIls(low)}–${formatIls(high)}`,
      withLead: (count: number, stores: string, lead: string) =>
        `${count} ouvertes (${stores}). ${lead}`,
      openOnly: (count: number, stores: string) =>
        `${count} ouvertes (${stores}). Rien à regrouper en une seule visite pour l'instant.`,
    }
  }
  return {
    quiet: 'אין תקלות פתוחות. הכל שקט.',
    noPapers: (store?: string) =>
      store ? `אין מסמך באיחור בסניף ${store}.` : 'אין מסמך באיחור או בחודש הקרוב.',
    noGear: (store?: string) =>
      store ? `אין ציוד שחוזר בסניף ${store}.` : 'אין ציוד שחוזר על עצמו.',
    paperLate: (label: string, store: string) => `${label} בסניף ${store} כבר באיחור.`,
    paperSoon: (label: string, store: string) => `${label} בסניף ${store} בעוד פחות מחודש.`,
    gearFact: (name: string, store: string, times: number, open: string | null, cost: number | null) =>
      `${name} בסניף ${store} — ${times} תקלות.${open ? ` עכשיו: ${open}.` : ''}${cost != null ? ` נרשם עליו ${formatIls(cost)}.` : ''}`,
    more: (count: number) => `ועוד ${count}.`,
    nothingToCombine: 'אין תקלות פתוחות, ואין מה לאחד.',
    noBundleYet: (count: number) =>
      `יש ${count} תקלות פתוחות, ועדיין אין חבילה לאדם אחד. דחוף מטופל מיד, בלי לחכות.`,
    storeMissing: 'לא רואה את הסניף הזה בתקלות הפתוחות.',
    storeCount: (count: number) => `${count} פתוחות`,
    noCategory: (label: string) => `אין תקלות פתוחות מסוג ${label}.`,
    categoryCount: (count: number, label: string) => `${count} תקלות ${label}:`,
    askMore: 'אפשר לשאול על שם סניף, מה כדאי לאחד, או מה טווח המחיר.',
    noRange: 'אין עדיין מחיר שנרשם, אז אין טווח.',
    rangeLead: 'הטווח הוא הקצוות של מחירים שכבר נרשמו מאותו סוג.',
    onePrice: (amount: number) => `מחיר אחד שנרשם, ${formatIls(amount)}`,
    span: (low: number, high: number) => `${formatIls(low)}–${formatIls(high)}`,
    withLead: (count: number, stores: string, lead: string) =>
      `פתוחות ${count} (${stores}). ${lead}`,
    openOnly: (count: number, stores: string) =>
      `פתוחות ${count} (${stores}). אין עדיין חבילה לאדם אחד.`,
  }
}
