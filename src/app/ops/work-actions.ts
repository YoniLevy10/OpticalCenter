'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getServerActor } from '@/lib/auth/server-actor'
import { shouldAllowDemoEntry } from '@/lib/auth/home-path'
import { actorHasHqAccess } from '@/lib/auth/types'
import {
  addCatalogItem,
  addDocument,
  addOutcome,
  addTask,
  addTasksFromTranscript,
  applySpendDecision,
  createSpend,
  getDriveSync,
  ingestFile,
  moveStock,
  recordActualSpend,
  recordClassificationCorrection,
  renewStoredDocument,
  reviseSpend,
  toggleTask,
} from '@/lib/data/ops-ledger'
import { ISRAEL_STORES, israelStoreId } from '@/modules/stores/israel-stores'
import { updatePriority } from '@/modules/tickets/service'
import { TICKET_PRIORITIES, type TicketPriority } from '@/modules/tickets/constants'
import { importDriveLink } from '@/modules/drive/import'
import { parseDriveLink } from '@/modules/drive/folder'
import { syncDriveFolder } from '@/modules/drive/sync'
import { persistOpsLedger } from '@/lib/data/ops-db'
import { notifyAri, notifyPhone } from '@/modules/notify/ari'

async function actorName() {
  const actor = await getServerActor()
  if (!actor && !shouldAllowDemoEntry()) throw new Error('נדרשת כניסה')
  return actor?.full_name || 'ארי'
}

async function refresh(path: string) {
  await persistOpsLedger()
  revalidatePath(path)
  revalidatePath('/ops/dashboard')
  revalidatePath('/ops/documents')
}

function storeManagerLabel(storeCode: string) {
  const store = ISRAEL_STORES.find((row) => row.code === storeCode.trim())
  if (!store) return null
  return {
    store,
    label: `${store.managerName} · ${store.name}`,
  }
}

export async function setTicketPriority(ticketId: string, priority: TicketPriority) {
  const actor = await getServerActor()
  if (!actor && !shouldAllowDemoEntry()) throw new Error('נדרשת כניסה')
  if (actor && !actorHasHqAccess(actor) && !shouldAllowDemoEntry()) {
    throw new Error('אין הרשאה לשנות דחיפות')
  }
  if (!TICKET_PRIORITIES.includes(priority)) throw new Error('עדיפות לא חוקית')
  const { getById } = await import('@/modules/tickets/service')
  const before = await getById(ticketId)
  await updatePriority(ticketId, priority, actor?.id ?? null)
  if (before && before.priority !== priority) {
    recordClassificationCorrection(ticketId, before.priority, priority)
  }
  await refresh(`/ops/tickets/${ticketId}`)
  revalidatePath('/ops/tickets')
}

export async function requestTicketPayment(formData: FormData) {
  await actorName()
  const storeCode = String(formData.get('storeCode') || '')
  const manager = storeManagerLabel(storeCode)
  const priority = String(formData.get('priority') || '')
  const reason = String(formData.get('reason') || '')
  createSpend({
    storeId: String(formData.get('storeId') || ''),
    storeCode,
    storeName: String(formData.get('storeName') || manager?.store.name || ''),
    ticketId: String(formData.get('ticketId') || '') || null,
    reason,
    vendorName: String(formData.get('vendor') || '') || null,
    requestedAmount: Number(formData.get('amount') || 0),
    scope: String(formData.get('scope') || '') || null,
    urgent: formData.get('urgent') === 'on' || priority === 'critical' || priority === 'high',
    actor: manager?.label || 'מנהל סניף',
    requestedBy: manager?.label,
  })
  await notifyAri(
    `בקשת תשלום מטעם ${manager?.label ?? storeCode}: ${reason}. עלתה לאישור.`,
  )
  await refresh('/ops/approvals')
  redirect('/ops/approvals')
}

export async function submitSpend(formData: FormData) {
  const actor = await actorName()
  const storeCode = String(formData.get('storeCode') || '')
  const manager = storeManagerLabel(storeCode)
  createSpend({
    storeId: String(formData.get('storeId') || (manager ? israelStoreId(storeCode) : '')),
    storeCode,
    storeName: String(formData.get('storeName') || manager?.store.name || ''),
    ticketId: String(formData.get('ticketId') || '') || null,
    reason: String(formData.get('reason') || ''),
    vendorName: String(formData.get('vendor') || '') || null,
    requestedAmount: Number(formData.get('amount') || 0),
    scope: String(formData.get('scope') || '') || null,
    urgent: formData.get('urgent') === 'on',
    actor,
    requestedBy: manager?.label ?? actor,
  })
  const vendor = String(formData.get('vendor') || '').trim()
  await notifyAri(
    vendor
      ? `בקשת הוצאה חדשה מסניף ${String(formData.get('storeCode') || '')}: ${String(formData.get('reason') || '')}. ממתינה לאישור.`
      : `בקשת הוצאה מסניף ${String(formData.get('storeCode') || '')} בלי שם ספק. נדרשת הצעת מחיר לפני אישור.`,
  )
  await refresh('/ops/approvals')
}

export async function decideSpendAction(formData: FormData) {
  const actor = await actorName()
  if (
    (await getServerActor()) &&
    !(await getServerActor())?.memberships.some((m) => m.role === 'global_admin') &&
    !shouldAllowDemoEntry()
  ) {
    throw new Error('אישור הוצאה שמור למנהל הרשת')
  }
  const decision = String(formData.get('decision'))
  if (decision !== 'approved' && decision !== 'rejected' && decision !== 'needs_info') {
    throw new Error('החלטה לא תקינה')
  }
  const spend = applySpendDecision(String(formData.get('id')), decision, actor)
  const store = ISRAEL_STORES.find((row) => row.code === spend.storeCode)
  const verdict =
    decision === 'approved' ? 'אושרה' : decision === 'rejected' ? 'נדחתה' : 'מחכה למידע נוסף'
  if (store?.managerPhone) {
    await notifyPhone(
      store.managerPhone,
      `סניף ${spend.storeCode}: הבקשה «${spend.reason}» ${verdict}.`,
    )
  }
  await refresh('/ops/approvals')
  redirect(`/ops/approvals?notice=${decision}`)
}

export async function reviseSpendAction(formData: FormData) {
  await actorName()
  reviseSpend(String(formData.get('id')), {
    requestedAmount: Number(formData.get('amount') || 0),
    vendorName: String(formData.get('vendor') || '') || null,
    scope: String(formData.get('scope') || '') || null,
  })
  await refresh('/ops/approvals')
}

export async function actualSpendAction(formData: FormData) {
  const actor = await actorName()
  recordActualSpend(String(formData.get('id')), Number(formData.get('actual') || 0), actor)
  await refresh('/ops/approvals')
}

async function mirrorDrive() {
  const root = getDriveSync().rootFolderId || process.env.GOOGLE_DRIVE_FOLDER_ID?.trim()
  if (!root) return null
  try {
    return await syncDriveFolder(root)
  } catch {
    return null
  }
}

export async function importDriveAction(formData: FormData) {
  await actorName()
  const link = String(formData.get('link') || '')
  const parsed = parseDriveLink(link)
  if (!parsed || parsed.kind === 'folder') {
    const folderId = parsed?.id || getDriveSync().rootFolderId || process.env.GOOGLE_DRIVE_FOLDER_ID?.trim()
    if (!folderId) throw new Error('מדביקים קישור לתיקייה של ארי בדרייב.')
    const result = await syncDriveFolder(folderId)
    if (result.pulled > 0 && result.review > 0) {
      await notifyAri(
        `סנכרון דרייב: ${result.pulled} קבצים עודכנו, ${result.review} דורשים בדיקה.`,
      )
    }
    await refresh('/ops/documents')
    return {
      imported: result.pulled,
      pushed: result.pushed,
      review: result.review,
      removed: result.removed,
      writeSkipped: result.writeSkipped,
    }
  }
  const result = await importDriveLink(link)
  if (result.review > 0) {
    await notifyAri(
      `ייבוא דרייב: ${result.files.length} קבצים, ${result.review} דורשים בדיקה.`,
    )
  }
  await refresh('/ops/documents')
  return { imported: result.files.length, pushed: 0, review: result.review, removed: 0, writeSkipped: false }
}

export async function addDocumentAction(formData: FormData) {
  await actorName()
  const expiry = String(formData.get('expiry') || '')
  const sourceUrl = String(formData.get('sourceUrl') || '') || null
  const linked = sourceUrl ? parseDriveLink(sourceUrl) : null
  addDocument({
    storeId: String(formData.get('storeId') || ''),
    storeCode: String(formData.get('storeCode') || ''),
    storeName: String(formData.get('storeName') || ''),
    docType: String(formData.get('docType') || 'fire'),
    sourceUrl: linked?.kind === 'file' ? `https://drive.google.com/file/d/${linked.id}/view` : sourceUrl,
    extractedExpiry: expiry || null,
    computedNextCheck: null,
    owner: String(formData.get('owner') || '') || null,
    intakeStatus: expiry ? 'ingested' : 'needs_review',
    intakeReason: expiry ? null : 'תאריך התוקף לא ברור',
    driveFileId: linked?.kind === 'file' ? linked.id : null,
    fieldsLocked: true,
    localUpdatedAt: new Date().toISOString(),
  })
  await mirrorDrive()
  await refresh('/ops/documents')
}

export async function renewDocumentAction(formData: FormData) {
  await actorName()
  renewStoredDocument(String(formData.get('id')), {
    sourceUrl: String(formData.get('sourceUrl') || ''),
    extractedExpiry: String(formData.get('expiry') || '') || null,
  })
  await mirrorDrive()
  await refresh('/ops/documents')
}

export async function ingestFileAction(formData: FormData) {
  await actorName()
  ingestFile({
    name: String(formData.get('name') || ''),
    mime: String(formData.get('mime') || 'application/octet-stream'),
    sourceUrl: String(formData.get('sourceUrl') || '') || null,
    storeCodeHint: String(formData.get('storeCode') || '') || null,
    extractedText: String(formData.get('text') || '') || null,
    knownStoreCodes: ISRAEL_STORES.map((store) => store.code),
  })
  await refresh('/ops/documents')
}

export async function addTaskAction(formData: FormData) {
  await actorName()
  addTask({
    title: String(formData.get('title') || ''),
    storeId: null,
    storeCode: String(formData.get('storeCode') || '') || null,
    assignee: String(formData.get('assignee') || '') || null,
    dueAt: String(formData.get('due') || '') || null,
    ticketId: String(formData.get('ticketId') || '') || null,
    documentId: null,
    spendId: null,
    needsClarification: !formData.get('assignee') || !formData.get('due'),
    clarification:
      !formData.get('assignee') || !formData.get('due')
        ? 'חסר אחראי או מועד'
        : null,
  })
  await refresh('/ops/tasks')
}

export async function voiceTasksAction(formData: FormData) {
  const actor = await actorName()
  const result = addTasksFromTranscript(String(formData.get('transcript') || ''), actor)
  if (result.spends.length) {
    await notifyAri(`הקלטה יצרה ${result.spends.length} בקשות כספיות. הן ממתינות לאישור ולא יצאו לביצוע.`)
  }
  await refresh('/ops/tasks')
}

export async function toggleTaskAction(formData: FormData) {
  await actorName()
  toggleTask(String(formData.get('id')), formData.get('done') === '1')
  await refresh('/ops/tasks')
}

export async function addItemAction(formData: FormData) {
  await actorName()
  addCatalogItem(String(formData.get('name') || ''), String(formData.get('sku') || ''))
  await refresh('/ops/inventory')
}

export async function moveStockAction(formData: FormData) {
  await actorName()
  const kind = String(formData.get('kind'))
  if (kind !== 'in' && kind !== 'out' && kind !== 'transfer') throw new Error('תנועה לא תקינה')
  moveStock({
    itemId: String(formData.get('itemId') || ''),
    fromLocationId: String(formData.get('from') || '') || null,
    toLocationId: String(formData.get('to') || '') || null,
    quantity: Number(formData.get('quantity') || 0),
    ticketId: String(formData.get('ticketId') || '') || null,
    kind,
  })
  await refresh('/ops/inventory')
}

export async function addOutcomeAction(formData: FormData) {
  await actorName()
  addOutcome({
    vendorId: String(formData.get('vendorId') || crypto.randomUUID()),
    vendorName: String(formData.get('vendorName') || ''),
    category: String(formData.get('category') || 'other'),
    region: String(formData.get('region') || '') || null,
    price: Number(formData.get('price') || 0) || null,
    arrivalMinutes: Number(formData.get('arrival') || 0) || null,
    quality: Number(formData.get('quality') || 0) || null,
    warrantyNote: String(formData.get('warranty') || '') || null,
    success: formData.get('success') === 'on',
  })
  await refresh('/ops/vendors')
}

export async function correctCategoryAction(formData: FormData) {
  await actorName()
  recordClassificationCorrection(
    String(formData.get('ticketId') || ''),
    String(formData.get('from') || ''),
    String(formData.get('to') || ''),
  )
}
