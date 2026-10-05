import { persistOpsLedger } from '@/lib/data/ops-db'
import {
  addDocument,
  addTask,
  addTasksFromTranscript,
  applySpendDecision,
  deskPhones,
  createSpend,
  decideStoredDocument,
  ingestFile,
  listDocuments,
  listSpends,
} from '@/lib/data/ops-ledger'
import type { SpendRequest } from '@/modules/spend/policy'
import { expiryFromText } from '@/modules/drive/import'
import type { StoreDocument } from '@/modules/documents/rules'
import { send019Sms } from '@/lib/sms/019'
import { ISRAEL_STORES, israelStoreId } from '@/modules/stores/israel-stores'
import { canExecuteSpend } from '@/modules/spend/policy'
import {
  classifyInbound,
  isAriSender,
  parseDeskDecision,
  parseMoneyAmount,
  storeCodeFromText,
  type DeskDecision,
} from './classify'
import { sendWhatsAppTemplate, sendWhatsAppText } from './send'
import { defaultSessionTemplateLang, defaultSessionTemplateName } from './templates'

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

function outsideWindow(error?: string): boolean {
  return Boolean(error && /24|חלון|template/i.test(error))
}

async function notifyOneDesk(
  phone: string,
  text: string,
  dryRun: boolean,
): Promise<void> {
  if (!dryRun) {
    await send019Sms({ to: phone, message: text }).catch(() => undefined)
  }
  const buttons = [
    { id: 'desk_approve', title: 'לאשר' },
    { id: 'desk_reject', title: 'לדחות' },
    { id: 'desk_info', title: 'לבקש מידע' },
  ]
  let sent = await sendWhatsAppText({
    toWaId: phone,
    text,
    purpose: 'status_update',
    forceDryRun: dryRun,
    skipFailureQueue: true,
    buttons,
  }).catch(() => ({ ok: false as const, error: 'send failed' }))
  if (!sent.ok && !outsideWindow(sent.error)) {
    sent = await sendWhatsAppText({
      toWaId: phone,
      text,
      purpose: 'status_update',
      forceDryRun: dryRun,
      skipFailureQueue: true,
    }).catch(() => ({ ok: false as const, error: 'send failed' }))
  }
  if (!sent.ok && outsideWindow(sent.error)) {
    await sendWhatsAppTemplate({
      toWaId: phone,
      templateName: defaultSessionTemplateName(),
      languageCode: defaultSessionTemplateLang(),
      purpose: 'status_update',
      forceDryRun: dryRun,
      skipFailureQueue: true,
    }).catch(() => undefined)
  }
}

export async function notifyAriOnDesk(message: string, dryRun: boolean): Promise<void> {
  const text = message.trim()
  if (!text) return
  await Promise.all(deskPhones().map((phone) => notifyOneDesk(phone, text, dryRun)))
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

async function replyToStore(
  waId: string | null | undefined,
  text: string,
  dryRun: boolean,
): Promise<void> {
  if (!waId) return
  const sent = await sendWhatsAppText({
    toWaId: waId,
    text,
    purpose: 'status_update',
    forceDryRun: dryRun,
    skipFailureQueue: true,
  }).catch(() => ({ ok: false as const, error: 'send failed' }))
  if (!sent.ok && outsideWindow(sent.error)) {
    await sendWhatsAppTemplate({
      toWaId: waId,
      templateName: defaultSessionTemplateName(),
      languageCode: defaultSessionTemplateLang(),
      purpose: 'status_update',
      forceDryRun: dryRun,
      skipFailureQueue: true,
    }).catch(() => undefined)
  }
}

function latestOpen():
  | { kind: 'spend'; row: SpendRequest }
  | { kind: 'document'; row: StoreDocument }
  | null {
  const spends = listSpends().filter(
    (row) => row.status === 'pending' || row.status === 'needs_info',
  )
  const docs = listDocuments().filter(
    (row) => row.intakeStatus === 'needs_review' && !row.renewed,
  )
  const fromChat = [
    ...spends
      .filter((row) => row.originWaId)
      .map((row) => ({ kind: 'spend' as const, row, at: row.createdAt })),
    ...docs
      .filter((row) => row.originWaId)
      .map((row) => ({ kind: 'document' as const, row, at: row.createdAt })),
  ].sort((a, b) => b.at.localeCompare(a.at))
  if (fromChat[0]) return fromChat[0]
  const spend = spends[0]
  const doc = docs[0]
  if (spend && doc) {
    return doc.createdAt > spend.createdAt
      ? { kind: 'document', row: doc }
      : { kind: 'spend', row: spend }
  }
  if (spend) return { kind: 'spend', row: spend }
  if (doc) return { kind: 'document', row: doc }
  return null
}

function storeAnswer(kind: 'spend' | 'document', decision: DeskDecision): string {
  if (kind === 'spend') {
    if (decision === 'approved') return 'ההוצאה אושרה.'
    if (decision === 'rejected') return 'הבקשה נדחתה. היא עדיין לא אושרה.'
    return 'ארי ביקש מידע נוסף. הבקשה עדיין לא אושרה.'
  }
  if (decision === 'approved') return 'המסמך אושר.'
  if (decision === 'rejected') return 'המסמך נדחה.'
  return 'ארי ביקש מידע נוסף על המסמך.'
}

async function applyAriDecision(
  decision: DeskDecision,
  dryRun: boolean,
): Promise<DeskRouteResult> {
  const open = latestOpen()
  if (!open) {
    return { reply: 'אין בקשה שממתינה להחלטה.', storeReply: null }
  }
  const storeReply = storeAnswer(open.kind, decision)
  const origin = open.row.originWaId
  if (open.kind === 'spend') {
    applySpendDecision(open.row.id, decision, 'ארי')
  } else {
    decideStoredDocument(open.row.id, decision)
  }
  await remember()
  await replyToStore(origin, storeReply, dryRun)
  return {
    reply: `עודכן. ${storeReply}`,
    storeReply,
  }
}

async function landMoney(
  text: string,
  waId: string,
  store: DeskStore | null,
  dryRun: boolean,
): Promise<DeskRouteResult> {
  const amount = parseMoneyAmount(text)
  const spend = createSpend({
    storeId: store?.id ?? '',
    storeCode: store?.code ?? '',
    storeName: store?.name ?? 'לא צוין',
    ticketId: null,
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

/** A recording without a transcript stays a review item. It does not become a ticket. */
export async function landVoiceReview(input: {
  waId: string
  store: DeskStore | null
  dryRun: boolean
}): Promise<void> {
  addTask({
    title: 'הקלטה ממתינה לתמלול',
    storeId: input.store?.id ?? null,
    storeCode: input.store?.code ?? null,
    assignee: null,
    dueAt: null,
    ticketId: null,
    documentId: null,
    spendId: null,
    needsClarification: true,
    clarification: 'ההקלטה הגיעה בלי תמלול',
  })
  await remember()
  await notifyAriOnDesk(
    ariNote('הקלטה לבדיקה', input.store?.code || '—', 'תמלול'),
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
}): Promise<DeskRouteResult | null> {
  if (isAriSender(input.waId)) {
    const decision = parseDeskDecision(input.text)
    if (decision) return applyAriDecision(decision, input.dryRun)
  }
  const kind = classifyInbound({ text: input.text, mediaKind: input.mediaKind })
  if (kind === 'fault') return null
  const store = resolveStore(input.text, input.sessionStore)
  if (kind === 'money') {
    return landMoney(input.text?.trim() || '', input.waId, store, input.dryRun)
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
  return landMulti(input.text?.trim() || '', input.waId, store, input.dryRun)
}

/** Dispatch stays blocked until Ari approves. Used by the intake loop check. */
export function spendStillBlocked(spend: SpendRequest | null | undefined): boolean {
  return !canExecuteSpend(spend)
}
