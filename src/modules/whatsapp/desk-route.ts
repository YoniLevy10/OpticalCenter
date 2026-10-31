import { persistOpsLedger } from '@/lib/data/ops-db'
import {
  addDocument,
  addTask,
  addTasksFromTranscript,
  createSpend,
  ingestFile,
} from '@/lib/data/ops-ledger'
import type { SpendRequest } from '@/modules/spend/policy'
import { expiryFromText } from '@/modules/drive/import'
import type { StoreDocument } from '@/modules/documents/rules'
import { ISRAEL_STORES, israelStoreId } from '@/modules/stores/israel-stores'
import { canExecuteSpend } from '@/modules/spend/policy'
import { replyToAri } from '@/modules/ops/agent-chat'
import {
  classifyInbound,
  isAriSender,
  parseDeskDecision,
  parseMoneyAmount,
  storeCodeFromText,
  type DeskDecision,
} from './classify'

export type DeskStore = { id: string; code: string; name: string }

export type DeskRouteResult = {
  reply: string
  storeReply: string | null
}

const WAITING =
  'הבקשה ממתינה לאישור. היא עדיין לא אושרה.'

const DECISION_LINE = 'לאשר · לדחות · לבקש מידע'

export function lookupStore(code: string | null | undefined): DeskStore | null {
  if (!code) return null
  const store = ISRAEL_STORES.find(
    (row) => row.code === code || row.aliases?.includes(code),
  )
  if (!store) return null
  return {
    id: israelStoreId(store.stableKey ?? store.code),
    code: store.code,
    name: store.name,
  }
}

function knownCodes(): string[] {
  return ISRAEL_STORES.map((store) => store.code)
}

function resolveStore(
  text: string | null,
  sessionStore: DeskStore | null,
): DeskStore | null {
  return lookupStore(storeCodeFromText(text)) ?? sessionStore
}

async function remember(): Promise<void> {
  await persistOpsLedger().catch(() => undefined)
}

/** Ari decides in the app. WhatsApp stays between the store manager and this bot. */
export async function notifyAriOnDesk(message: string, _dryRun: boolean): Promise<void> {
  void message
}

function ariNote(headline: string, store: string, missing: string | null): string {
  return [
    headline,
    `סניף ${store}`,
    missing ? `חסר: ${missing}` : null,
    DECISION_LINE,
  ]
    .filter(Boolean)
    .join('\n')
}

async function applyAriDecision(
  _decision: DeskDecision,
  _dryRun: boolean,
): Promise<DeskRouteResult> {
  return {
    reply: 'ההחלטה נעשית במערכת. הוואטסאפ כאן הוא מול מנהלי הסניפים.',
    storeReply: null,
  }
}

function linkedOpenTicketId(openTicketId?: string | null): string | null {
  const id = openTicketId?.trim()
  return id || null
}

async function landMoney(
  text: string,
  waId: string,
  store: DeskStore | null,
  dryRun: boolean,
  openTicketId?: string | null,
): Promise<DeskRouteResult> {
  const amount = parseMoneyAmount(text)
  const spend = createSpend({
    storeId: store?.id ?? '',
    storeCode: store?.code ?? '',
    storeName: store?.name ?? 'לא צוין',
    ticketId: linkedOpenTicketId(openTicketId),
    reason: text,
    vendorName: null,
    requestedAmount: amount ?? 0,
    scope: text,
    urgent: false,
    actor: 'whatsapp',
    requestedBy: 'וואטסאפ',
    originWaId: waId,
  })
  if (amount == null) spend.status = 'needs_info'
  await remember()
  await notifyAriOnDesk(
    ariNote(
      amount == null ? 'בקשת הוצאה' : `בקשת הוצאה · ₪${amount}`,
      store?.code || '—',
      amount == null ? 'סכום' : null,
    ),
    dryRun,
  )
  return { reply: WAITING, storeReply: null }
}

async function landDocument(input: {
  text: string | null
  fileName: string | null
  mediaUrl: string | null
  waId: string
  store: DeskStore | null
  dryRun: boolean
}): Promise<DeskRouteResult> {
  const expiry = expiryFromText(input.text)
  const file = ingestFile({
    name: input.fileName?.trim() || 'מסמך.pdf',
    mime: 'application/pdf',
    sourceUrl: input.mediaUrl,
    storeCodeHint: input.store?.code ?? null,
    extractedText: input.text,
    knownStoreCodes: knownCodes(),
  })
  const uncertainStore = !input.store
  const uncertainDate = !expiry
  if (uncertainStore || uncertainDate || file.status !== 'ingested') {
    file.status = 'needs_review'
    file.reason = uncertainStore
      ? 'השיוך לסניף לא ודאי'
      : uncertainDate
        ? 'תאריך התוקף לא ברור'
        : file.reason
  }
  addDocument({
    storeId: input.store?.id ?? '',
    storeCode: input.store?.code ?? '',
    storeName: input.store?.name ?? 'לא צוין',
    docType: file.docType ?? file.name,
    sourceUrl: input.mediaUrl,
    extractedExpiry: expiry,
    computedNextCheck: null,
    owner: null,
    intakeStatus: file.status === 'ingested' ? 'ingested' : 'needs_review',
    intakeReason: file.reason,
    originWaId: input.waId,
  })
  await remember()
  const missing = [uncertainStore ? 'סניף' : null, uncertainDate ? 'תאריך תוקף' : null]
    .filter(Boolean)
    .join(', ')
  await notifyAriOnDesk(
    ariNote(`מסמך לבדיקה · ${file.name}`, input.store?.code || '—', missing || file.reason),
    input.dryRun,
  )
  return {
    reply: 'המסמך התקבל וממתין לבדיקה. הוא עדיין לא אושר.',
    storeReply: null,
  }
}

async function landMulti(
  text: string,
  waId: string,
  store: DeskStore | null,
  dryRun: boolean,
  openTicketId?: string | null,
): Promise<DeskRouteResult> {
  const { tasks, spends } = addTasksFromTranscript(text, 'whatsapp')
  for (const spend of spends) {
    const hinted = lookupStore(storeCodeFromText(spend.reason)) ?? store
    if (hinted) {
      spend.storeId = hinted.id
      spend.storeCode = hinted.code
      spend.storeName = hinted.name
    }
    spend.originWaId = waId
    spend.requestedBy = 'וואטסאפ'
    spend.ticketId = linkedOpenTicketId(openTicketId)
    const amount = parseMoneyAmount(spend.reason)
    if (amount != null) {
      spend.requestedAmount = amount
      spend.status = 'pending'
    }
  }
  for (const task of tasks) {
    if (!store) continue
    if (!task.storeId) task.storeId = store.id
    if (!task.storeCode) task.storeCode = store.code
  }
  await remember()
  const amount = spends[0] ? parseMoneyAmount(spends[0].reason) : null
  await notifyAriOnDesk(
    ariNote(
      spends.length
        ? `בקשת הוצאה${amount != null ? ` · ₪${amount}` : ''} ועוד ${tasks.length} עניינים`
        : `${tasks.length} עניינים מההודעה`,
      store?.code || spends[0]?.storeCode || '—',
      spends.some((row) => row.status === 'needs_info') ? 'סכום' : null,
    ),
    dryRun,
  )
  return {
    reply: spends.length
      ? WAITING
      : 'קלטתי כמה עניינים. מה שחסר מופיע אצל ארי.',
    storeReply: null,
  }
}

/**
 * Recording without a usable transcript → Ari review task.
 * Prefer linking to a placeholder ticket (with stashed audio) when one was opened.
 */
export async function landVoiceReview(input: {
  waId: string
  store: DeskStore | null
  dryRun: boolean
  ticketId?: string | null
}): Promise<void> {
  addTask({
    title: 'הקלטה ממתינה לתמלול',
    storeId: input.store?.id ?? null,
    storeCode: input.store?.code ?? null,
    assignee: null,
    dueAt: null,
    ticketId: input.ticketId ?? null,
    documentId: null,
    spendId: null,
    needsClarification: true,
    clarification: input.ticketId
      ? 'ההקלטה צורפה לתקלה — נדרש תמלול / השלמת תיאור'
      : 'ההקלטה הגיעה בלי תמלול',
  })
  await remember()
  await notifyAriOnDesk(
    ariNote(
      'הקלטה לבדיקה',
      input.store?.code || '—',
      input.ticketId ? `תמלול · ${input.ticketId.slice(0, 8)}` : 'תמלול',
    ),
    input.dryRun,
  )
}

/**
 * After transcription and before a ticket is opened.
 * Returns null when the message is a fault and should keep the existing path.
 */
export async function routeInboundToDesk(input: {
  text: string | null
  mediaKind: 'image' | 'video' | 'document' | 'audio' | null
  fileName?: string | null
  mediaUrl: string | null
  waId: string
  sessionStore: DeskStore | null
  dryRun: boolean
  /** Set only when the intake session already points at one open ticket. */
  openTicketId?: string | null
}): Promise<DeskRouteResult | null> {
  if (isAriSender(input.waId)) {
    const decision = parseDeskDecision(input.text)
    if (decision) return applyAriDecision(decision, input.dryRun)
    const message = input.text?.trim()
    if (message) {
      const answered = await replyToAri({ message, actor: null, locale: 'he', source: 'whatsapp' })
      return { reply: answered.reply, storeReply: null }
    }
  }
  const kind = classifyInbound({ text: input.text, mediaKind: input.mediaKind })
  if (kind === 'fault') return null
  const store = resolveStore(input.text, input.sessionStore)
  if (kind === 'money') {
    return landMoney(
      input.text?.trim() || '',
      input.waId,
      store,
      input.dryRun,
      input.openTicketId,
    )
  }
  if (kind === 'document') {
    return landDocument({
      text: input.text,
      fileName: input.fileName ?? null,
      mediaUrl: input.mediaUrl,
      waId: input.waId,
      store,
      dryRun: input.dryRun,
    })
  }
  return landMulti(
    input.text?.trim() || '',
    input.waId,
    store,
    input.dryRun,
    input.openTicketId,
  )
}

/** Dispatch stays blocked until Ari approves. Used by the intake loop check. */
export function spendStillBlocked(spend: SpendRequest | null | undefined): boolean {
  return !canExecuteSpend(spend)
}
