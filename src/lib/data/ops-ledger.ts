import {
  canonicalStoreCode,
  ISRAEL_STORES,
  israelStoreId,
} from '@/modules/stores/israel-stores'
import {
  decideSpend,
  withCommercialChange,
  type SpendRequest,
  type SpendStatus,
} from '@/modules/spend/policy'
import { proposeSyncedValue } from '@/modules/stores/directory-rules'
import { BRANCH_CATALOG } from '@/modules/documents/branch-catalog'
import {
  renewDocument,
  type StoreDocument,
} from '@/modules/documents/rules'
import {
  applyMovement,
  type AssetUnit,
  type CatalogItem,
  type StockMovement,
  type StockQty,
} from '@/modules/inventory/stock'
import type { VendorOutcome } from '@/modules/vendors/outcomes'
import { runIngestPipeline, markSourceDeleted, type IngestedFile } from '@/modules/ingestion/pipeline'
import { splitVoiceTranscript } from '@/modules/tasks/voice-split'
import { TRIAL_SPENDS } from '@/modules/demo/trial-scenario'

export const AYA_PHONE = '050-22840204'
export const AYA_STORE_CODE = '6018'
/** Optical Center ops owner. Text, so a leading zero is kept. */
export const ARI_PHONE = '0509881951'
/**
 * Extra desk manager for tests, until the live pilot covers the store network.
 * Stored exactly as given. Not a store and not a replacement for Ari.
 */
export const TEST_DESK_PHONE = '0548102688'

/** Who may approve/reject desk items over WhatsApp (buttons or free text). */
export function deskDecisionPhones(): string[] {
  return [ARI_PHONE, TEST_DESK_PHONE]
}

/**
 * Who receives proactive desk alerts (SMS/WhatsApp).
 * Ari is excluded for now — no spam to 050-9881951 until pilot go-live.
 */
export function deskNotifyPhones(): string[] {
  return [TEST_DESK_PHONE]
}

/** @deprecated Prefer deskDecisionPhones / deskNotifyPhones. */
export function deskPhones(): string[] {
  return deskDecisionPhones()
}

export type DirectoryContact = {
  id: string
  fullName: string
  phone: string
  phoneStatus: 'ok' | 'needs_verification'
  roleLabel: string
  storeIds: string[]
  isActive: boolean
}

export type AuditEntry = {
  id: string
  at: string
  actor: string
  entity: string
  entityId: string
  field: string
  previous: string
  next: string
}

export type FieldConflict = {
  id: string
  entity: string
  entityId: string
  field: string
  current: string
  incoming: string
  createdAt: string
  resolved: boolean
}

export type OpsTask = {
  id: string
  title: string
  storeId: string | null
  storeCode: string | null
  assignee: string | null
  dueAt: string | null
  ticketId: string | null
  documentId: string | null
  spendId: string | null
  done: boolean
  /** open · doing · waiting · done. Older rows derive this from done / needsClarification. */
  status?: 'open' | 'doing' | 'waiting' | 'done' | null
  needsClarification: boolean
  clarification: string | null
  createdAt: string
}

export type StoreOverlay = {
  storeId: string
  areaManager: string | null
  locks: string[]
}

type Ledger = {
  contacts: DirectoryContact[]
  audits: AuditEntry[]
  conflicts: FieldConflict[]
  overlays: StoreOverlay[]
  spends: SpendRequest[]
  documents: StoreDocument[]
  tasks: OpsTask[]
  files: IngestedFile[]
  catalog: CatalogItem[]
  stock: StockQty[]
  units: AssetUnit[]
  movements: StockMovement[]
  outcomes: VendorOutcome[]
  corrections: {
    id: string
    ticketId: string
    from: string
    to: string
    at: string
    fromCategory?: string
    toCategory?: string
    fromPriority?: string
    toPriority?: string
    reason?: string | null
  }[]
}

function seedContacts(): DirectoryContact[] {
  const byPhone = new Map<string, DirectoryContact>()
  for (const store of ISRAEL_STORES) {
    const digits = store.managerPhone.replace(/\D/g, '')
    const storeId = israelStoreId(store.code)
    const existing = byPhone.get(digits)
    if (existing) {
      if (!existing.storeIds.includes(storeId)) existing.storeIds.push(storeId)
      continue
    }
    const isAya = store.code === AYA_STORE_CODE
    byPhone.set(digits, {
      id: isAya ? 'contact-aya-6018' : `contact-${store.code}`,
      fullName: store.managerName,
      phone: isAya ? AYA_PHONE : store.managerPhone,
      phoneStatus: isAya ? 'needs_verification' : 'ok',
      roleLabel: 'מנהל סניף',
      storeIds: [storeId],
      isActive: true,
    })
  }
  const contacts = [...byPhone.values()]
  contacts.push({
    id: 'contact-test-desk',
    fullName: 'מנהל בדיקות',
    phone: TEST_DESK_PHONE,
    phoneStatus: 'ok',
    roleLabel: 'מנהל מערכת',
    storeIds: [],
    isActive: true,
  })
  return contacts
}

function seedLedger(): Ledger {
  return {
    contacts: seedContacts(),
    audits: [],
    conflicts: [],
    overlays: ISRAEL_STORES.map((store) => ({
      storeId: israelStoreId(store.code),
      areaManager: store.areaManager,
      locks: store.code === AYA_STORE_CODE ? ['phone'] : [],
    })),
    spends: [],
    documents: [],
    tasks: [],
    files: [],
    catalog: [],
    stock: [],
    units: [],
    movements: [],
    outcomes: [],
    corrections: [],
  }
}

const ledgerGlobal = globalThis as typeof globalThis & { __miloOpsLedger?: Ledger }

/** One ledger for the page and the assistant route. Next keeps those as separate module copies. */
function sharedLedger(): Ledger {
  if (!ledgerGlobal.__miloOpsLedger) ledgerGlobal.__miloOpsLedger = seedLedger()
  return ledgerGlobal.__miloOpsLedger
}

let ledger = sharedLedger()
ensureTrialSpends()
ensureTrialWork()

function trialSpendRows(): SpendRequest[] {
  const now = new Date().toISOString()
  return TRIAL_SPENDS.map((seed) => {
    const store = ISRAEL_STORES.find((row) => row.code === seed.storeCode)
    const approved = seed.status === 'approved'
    return {
      id: seed.id,
      storeId: israelStoreId(seed.storeCode),
      storeCode: seed.storeCode,
      storeName: store?.name ?? seed.storeCode,
      ticketId: seed.ticketId,
      assetId: seed.assetId ?? null,
      reason: seed.reason,
      vendorName: seed.vendorName,
      requestedAmount: seed.requestedAmount,
      approvedAmount: approved ? seed.requestedAmount : null,
      actualAmount: null,
      scope: seed.scope,
      status: seed.status,
      urgent: seed.urgent,
      requestedBy: store
        ? `${store.managerName} · ${store.name}`
        : seed.storeCode,
      decidedBy: approved ? 'ארי' : null,
      decidedAt: approved ? now : null,
      needsReapproval: false,
      createdAt: now,
      updatedAt: now,
    }
  })
}

function ensureTrialSpends() {
  for (const row of trialSpendRows()) {
    if (ledger.spends.some((spend) => spend.id === row.id)) continue
    ledger.spends.push(row)
  }
}

function ensureTrialWork() {
  const now = Date.now()
  const at = (hours: number) => new Date(now + hours * 3600_000).toISOString()
  const tasks: OpsTask[] = [
    {
      id: 'trial-task-6001',
      title: 'לוודא שחשמלנט מגיע לכיכר ציון לפני פתיחה',
      storeId: israelStoreId('6001'),
      storeCode: '6001',
      assignee: 'ארי',
      dueAt: at(6),
      ticketId: 'trial-6001-electrical',
      documentId: null,
      spendId: 'trial-spend-6001',
      done: false,
      needsClarification: false,
      clarification: null,
      createdAt: at(-4),
    },
    {
      id: 'trial-task-6037',
      title: 'לאשר ביקור משולב בחיפה הרצל',
      storeId: israelStoreId('6037'),
      storeCode: '6037',
      assignee: 'ארי',
      dueAt: at(20),
      ticketId: 'trial-6037-security',
      documentId: null,
      spendId: 'trial-spend-bundle-6037',
      done: false,
      needsClarification: false,
      clarification: null,
      createdAt: at(-2),
    },
    {
      id: 'trial-task-6007',
      title: 'לבקש הצעת מחיר שנייה למזגן בראשון לציון',
      storeId: israelStoreId('6007'),
      storeCode: '6007',
      assignee: 'ונסה',
      dueAt: at(48),
      ticketId: 'trial-6007-hvac',
      documentId: null,
      spendId: 'trial-spend-6007',
      done: false,
      needsClarification: true,
      clarification: 'האם להחליף או רק למלא גז',
      createdAt: at(-8),
    },
    {
      id: 'trial-task-6006',
      title: 'לסגור את ביקור המיזוג באבן גבירול',
      storeId: israelStoreId('6006'),
      storeCode: '6006',
      assignee: 'יוסי כהן',
      dueAt: at(-6),
      ticketId: 'trial-6006-hvac',
      documentId: null,
      spendId: null,
      done: true,
      needsClarification: false,
      clarification: null,
      createdAt: at(-30),
    },
  ]
  for (const task of tasks) {
    if (ledger.tasks.some((row) => row.id === task.id)) continue
    ledger.tasks.push(task)
  }

  const docs: StoreDocument[] = [
    {
      id: 'trial-doc-6006-fire',
      storeId: israelStoreId('6006'),
      storeCode: '6006',
      storeName: 'תל אביב אבן גבירול',
      docType: 'fire',
      sourceUrl: null,
      extractedExpiry: at(-48),
      computedNextCheck: at(-48),
      owner: 'לילך',
      intakeStatus: 'needs_review',
      intakeReason: 'תוקף כיבוי אש עבר',
      version: 1,
      previousId: null,
      renewed: false,
      createdAt: at(-200),
      fieldsLocked: true,
    },
    {
      id: 'trial-doc-6010-electrical',
      storeId: israelStoreId('6010'),
      storeCode: '6010',
      storeName: 'חולון',
      docType: 'electrical',
      sourceUrl: null,
      extractedExpiry: at(24 * 12),
      computedNextCheck: at(24 * 12),
      owner: 'אנה',
      intakeStatus: 'ingested',
      intakeReason: null,
      version: 1,
      previousId: null,
      renewed: false,
      createdAt: at(-80),
      fieldsLocked: true,
    },
    {
      id: 'trial-doc-6001-hearing',
      storeId: israelStoreId('6001'),
      storeCode: '6001',
      storeName: 'ירושלים כיכר ציון',
      docType: 'hearing_a',
      sourceUrl: null,
      extractedExpiry: at(24 * 18),
      computedNextCheck: at(24 * 18),
      owner: 'קרן',
      intakeStatus: 'needs_review',
      intakeReason: 'כיול שמיעה מתקרב',
      version: 1,
      previousId: null,
      renewed: false,
      createdAt: at(-40),
      fieldsLocked: false,
    },
    {
      id: 'trial-doc-6037-fire',
      storeId: israelStoreId('6037'),
      storeCode: '6037',
      storeName: 'חיפה הרצל',
      docType: 'fire',
      sourceUrl: null,
      extractedExpiry: at(24 * 40),
      computedNextCheck: at(24 * 40),
      owner: 'חיפה הרצל',
      intakeStatus: 'ingested',
      intakeReason: null,
      version: 1,
      previousId: null,
      renewed: false,
      createdAt: at(-10),
      fieldsLocked: true,
    },
  ]
  for (const doc of docs) {
    if (ledger.documents.some((row) => row.id === doc.id)) continue
    ledger.documents.push(doc)
  }
}

export type DriveSyncState = {
  rootFolderId: string | null
  lastSyncAt: string | null
  lastError: string | null
  lastPulled: number
  lastPushed: number
  lastReview: number
}

function emptyDriveSync(): DriveSyncState {
  return {
    rootFolderId: null,
    lastSyncAt: null,
    lastError: null,
    lastPulled: 0,
    lastPushed: 0,
    lastReview: 0,
  }
}

let driveSync = emptyDriveSync()

export function getDriveSync(): DriveSyncState {
  return driveSync
}

export function setDriveSync(patch: Partial<DriveSyncState>) {
  driveSync = { ...driveSync, ...patch }
}

export function applyDriveMirror(files: IngestedFile[], documents: StoreDocument[]) {
  ledger.files = files
  ledger.documents = documents
}

export function resetOpsLedger() {
  ledger = seedLedger()
  ledgerGlobal.__miloOpsLedger = ledger
  driveSync = emptyDriveSync()
  ensureTrialSpends()
}

export function replacePersistedOps(next: {
  files?: Ledger['files']
  documents?: Ledger['documents']
  spends?: Ledger['spends']
  tasks?: Ledger['tasks']
}) {
  if (next.files) ledger.files = next.files
  if (next.documents) ledger.documents = next.documents
  if (next.spends) ledger.spends = next.spends
  if (next.tasks) ledger.tasks = next.tasks
}

function audit(entry: Omit<AuditEntry, 'id' | 'at'>, at = new Date().toISOString()) {
  ledger.audits.unshift({
    id: `audit-${ledger.audits.length + 1}-${entry.field}`,
    at,
    ...entry,
  })
}

export function listAudits(): AuditEntry[] {
  return ledger.audits
}

export function listContacts(storeId?: string): DirectoryContact[] {
  return ledger.contacts.filter((contact) => {
    if (!storeId) return true
    return contact.storeIds.includes(storeId)
  })
}

/** Match a live store row (uuid) and the stable memory id for the same branch. */
export function listContactsForStore(storeId: string, code: string): DirectoryContact[] {
  const canonical = canonicalStoreCode(code)
  const keys = new Set([storeId, israelStoreId(code), israelStoreId(canonical)])
  return ledger.contacts.filter(
    (contact) => contact.isActive && contact.storeIds.some((id) => keys.has(id)),
  )
}

export function areaManagerForStore(storeId: string, code: string): string | null {
  return (
    areaManagerFor(storeId) ??
    areaManagerFor(israelStoreId(canonicalStoreCode(code))) ??
    ISRAEL_STORES.find((store) => store.code === canonicalStoreCode(code))?.areaManager ??
    null
  )
}

export function upsertContact(
  input: Omit<DirectoryContact, 'id' | 'isActive' | 'phoneStatus'> & {
    id?: string
    phoneStatus?: DirectoryContact['phoneStatus']
    actor: string
  },
): DirectoryContact {
  const phone = input.phone.trim()
  if (input.id) {
    const current = ledger.contacts.find((contact) => contact.id === input.id)
    if (!current) throw new Error('איש קשר לא נמצא')
    if (current.phone !== phone) {
      audit({
        actor: input.actor,
        entity: 'contact',
        entityId: current.id,
        field: 'phone',
        previous: current.phone,
        next: phone,
      })
      current.phone = phone
      if (current.id === 'contact-aya-6018' && phone === AYA_PHONE) {
        current.phoneStatus = 'needs_verification'
      }
    }
    current.fullName = input.fullName.trim()
    current.roleLabel = input.roleLabel
    current.storeIds = [...new Set(input.storeIds)]
    if (input.phoneStatus) current.phoneStatus = input.phoneStatus
    return current
  }
  const contact: DirectoryContact = {
    id: `contact-${crypto.randomUUID()}`,
    fullName: input.fullName.trim(),
    phone,
    phoneStatus: input.phoneStatus ?? 'ok',
    roleLabel: input.roleLabel,
    storeIds: [...new Set(input.storeIds)],
    isActive: true,
  }
  ledger.contacts.push(contact)
  audit({
    actor: input.actor,
    entity: 'contact',
    entityId: contact.id,
    field: 'create',
    previous: '',
    next: contact.fullName,
  })
  return contact
}

export function setContactActive(id: string, isActive: boolean, actor: string) {
  const contact = ledger.contacts.find((row) => row.id === id)
  if (!contact) throw new Error('איש קשר לא נמצא')
  audit({
    actor,
    entity: 'contact',
    entityId: id,
    field: 'is_active',
    previous: String(contact.isActive),
    next: String(isActive),
  })
  contact.isActive = isActive
  return contact
}

export function verifyContactPhone(id: string, actor: string) {
  const contact = ledger.contacts.find((row) => row.id === id)
  if (!contact) throw new Error('איש קשר לא נמצא')
  audit({
    actor,
    entity: 'contact',
    entityId: id,
    field: 'phone_status',
    previous: contact.phoneStatus,
    next: 'ok',
  })
  contact.phoneStatus = 'ok'
  return contact
}

export function proposeContactPhone(id: string, incoming: string, actor: string) {
  const contact = ledger.contacts.find((row) => row.id === id)
  if (!contact) throw new Error('איש קשר לא נמצא')
  const overlay = ledger.overlays.find((row) => row.storeId === contact.storeIds[0])
  const proposal = proposeSyncedValue({
    field: 'phone',
    current: contact.phone,
    incoming,
    locked: overlay?.locks.includes('phone') ?? contact.id === 'contact-aya-6018',
    needsVerification: contact.phoneStatus === 'needs_verification',
  })
  if (proposal.action === 'conflict') {
    ledger.conflicts.unshift({
      id: `conflict-${ledger.conflicts.length + 1}`,
      entity: 'contact',
      entityId: id,
      field: 'phone',
      current: proposal.current,
      incoming: proposal.incoming,
      createdAt: new Date().toISOString(),
      resolved: false,
    })
    return proposal
  }
  if (contact.phone !== proposal.value) {
    audit({
      actor,
      entity: 'contact',
      entityId: id,
      field: 'phone',
      previous: contact.phone,
      next: proposal.value,
    })
    contact.phone = proposal.value
  }
  return proposal
}

export function listConflicts(): FieldConflict[] {
  return ledger.conflicts.filter((row) => !row.resolved)
}

export function resolveConflict(id: string, keep: 'current' | 'incoming', actor: string) {
  const conflict = ledger.conflicts.find((row) => row.id === id)
  if (!conflict) throw new Error('סתירה לא נמצאה')
  conflict.resolved = true
  audit({
    actor,
    entity: conflict.entity,
    entityId: conflict.entityId,
    field: conflict.field,
    previous: conflict.current,
    next: keep === 'incoming' ? conflict.incoming : conflict.current,
  })
  if (keep === 'incoming' && conflict.entity === 'contact') {
    const contact = ledger.contacts.find((row) => row.id === conflict.entityId)
    if (contact) contact.phone = conflict.incoming
  }
  return conflict
}

export function setAreaManager(storeId: string, name: string, actor: string) {
  let overlay = ledger.overlays.find((row) => row.storeId === storeId)
  if (!overlay) {
    overlay = { storeId, areaManager: null, locks: [] }
    ledger.overlays.push(overlay)
  }
  audit({
    actor,
    entity: 'store',
    entityId: storeId,
    field: 'area_manager',
    previous: overlay.areaManager ?? '',
    next: name.trim(),
  })
  overlay.areaManager = name.trim()
  if (!overlay.locks.includes('area_manager')) overlay.locks.push('area_manager')
  return overlay
}

export function areaManagerFor(storeId: string): string | null {
  return ledger.overlays.find((row) => row.storeId === storeId)?.areaManager ?? null
}

export function listSpends(): SpendRequest[] {
  ensureTrialSpends()
  return [...ledger.spends]
}

export function spendForTicket(ticketId: string): SpendRequest | null {
  return (
    ledger.spends.find((row) => row.ticketId === ticketId && row.status !== 'rejected') ??
    null
  )
}

/** All non-rejected spends linked to a ticket (for true-cost rollups). */
export function spendsForTicket(ticketId: string): SpendRequest[] {
  return ledger.spends.filter(
    (row) => row.ticketId === ticketId && row.status !== 'rejected',
  )
}

/** All non-rejected spends linked to an asset. */
export function spendsForAsset(assetId: string): SpendRequest[] {
  return ledger.spends.filter(
    (row) => row.assetId === assetId && row.status !== 'rejected',
  )
}

export function createSpend(
  input: Omit<
    SpendRequest,
    | 'id'
    | 'status'
    | 'approvedAmount'
    | 'actualAmount'
    | 'decidedBy'
    | 'decidedAt'
    | 'needsReapproval'
    | 'createdAt'
    | 'updatedAt'
    | 'requestedBy'
  > & {
    actor: string
    requestedBy?: string
  },
): SpendRequest {
  const now = new Date().toISOString()
  const spend: SpendRequest = {
    id: crypto.randomUUID(),
    storeId: input.storeId,
    storeCode: input.storeCode,
    storeName: input.storeName,
    ticketId: input.ticketId,
    assetId: input.assetId ?? null,
    reason: input.reason,
    vendorName: input.vendorName,
    requestedAmount: input.requestedAmount,
    approvedAmount: null,
    actualAmount: null,
    scope: input.scope,
    status: 'pending',
    urgent: input.urgent,
    requestedBy: input.requestedBy ?? input.actor,
    originWaId: input.originWaId ?? null,
    decidedBy: null,
    decidedAt: null,
    needsReapproval: false,
    createdAt: now,
    updatedAt: now,
  }
  ledger.spends.unshift(spend)
  audit({
    actor: input.actor,
    entity: 'spend',
    entityId: spend.id,
    field: 'status',
    previous: '',
    next: 'pending',
  })
  return spend
}

export function applySpendDecision(
  id: string,
  decision: Exclude<SpendStatus, 'pending'>,
  actor: string,
  approvedAmount?: number | null,
): SpendRequest {
  const spend = ledger.spends.find((row) => row.id === id)
  if (!spend) throw new Error('בקשה לא נמצאה')
  const previous = spend.status
  const next = decideSpend(spend, decision, actor, approvedAmount)
  Object.assign(spend, next)
  audit({
    actor,
    entity: 'spend',
    entityId: id,
    field: 'status',
    previous,
    next: decision,
  })
  return spend
}

export function reviseSpend(
  id: string,
  patch: { requestedAmount?: number; vendorName?: string | null; scope?: string | null },
): SpendRequest {
  const spend = ledger.spends.find((row) => row.id === id)
  if (!spend) throw new Error('בקשה לא נמצאה')
  Object.assign(spend, withCommercialChange(spend, patch))
  return spend
}

export function recordActualSpend(id: string, actualAmount: number, actor: string): SpendRequest {
  const spend = ledger.spends.find((row) => row.id === id)
  if (!spend) throw new Error('בקשה לא נמצאה')
  audit({
    actor,
    entity: 'spend',
    entityId: id,
    field: 'actual_amount',
    previous: spend.actualAmount == null ? '' : String(spend.actualAmount),
    next: String(actualAmount),
  })
  spend.actualAmount = actualAmount
  spend.updatedAt = new Date().toISOString()
  return spend
}

function branchDocument(row: (typeof BRANCH_CATALOG)[number], now: string): StoreDocument {
  const store = row.storeCode
    ? ISRAEL_STORES.find((item) => item.code === row.storeCode)
    : undefined
  return {
    id: row.id,
    storeId: store ? israelStoreId(store.code) : '',
    storeCode: row.storeCode,
    storeName: store?.name ?? 'לבדיקה',
    docType: row.kind,
    sourceUrl: row.sourceUrl,
    extractedExpiry: row.expiry ? `${row.expiry}T00:00:00.000Z` : null,
    computedNextCheck: null,
    owner: store?.managerName ?? 'ארי',
    intakeStatus: row.status,
    intakeReason: row.reason,
    version: 1,
    previousId: null,
    renewed: false,
    createdAt: now,
    fieldsLocked: false,
    localUpdatedAt: now,
  }
}

function ensureBranchDocuments() {
  const now = '2026-10-28T00:00:00.000Z'
  const byId = new Map(BRANCH_CATALOG.map((row) => [row.id, row]))
  const fileIds = new Set(BRANCH_CATALOG.map((row) => row.fileId))
  ledger.documents = ledger.documents.filter(
    (doc) => !doc.id.startsWith('branch-') || byId.has(doc.id),
  )
  ledger.files = ledger.files.filter(
    (file) => !file.id.startsWith('branch-file-') || fileIds.has(file.id),
  )
  for (const doc of ledger.documents) {
    const row = byId.get(doc.id)
    if (!row || doc.fieldsLocked || doc.renewed) continue
    Object.assign(doc, branchDocument(row, doc.createdAt || now))
  }
  for (const row of BRANCH_CATALOG) {
    if (!ledger.documents.some((doc) => doc.id === row.id)) {
      ledger.documents.push(branchDocument(row, now))
    }
    if (!ledger.files.some((file) => file.id === row.fileId)) {
      ledger.files.push({
        id: row.fileId,
        name: row.name,
        mime: 'application/pdf',
        sourceUrl: row.sourceUrl,
        stage: 'validate',
        docType: row.kind,
        storeCode: row.storeCode || null,
        extractedText: row.summary,
        status: row.status,
        reason: row.reason,
        versionOf: null,
        deletedInSource: false,
        driveFileId: null,
        driveModifiedTime: null,
        origin: null,
        localUpdatedAt: now,
      })
    }
  }
}

export function listDocuments(): StoreDocument[] {
  ensureBranchDocuments()
  return ledger.documents
}

export function decideStoredDocument(
  id: string,
  decision: 'approved' | 'rejected' | 'needs_info',
): StoreDocument {
  const doc = ledger.documents.find((row) => row.id === id)
  if (!doc) throw new Error('מסמך לא נמצא')
  if (decision === 'approved') {
    doc.intakeStatus = 'ingested'
    doc.intakeReason = null
    doc.fieldsLocked = true
  } else if (decision === 'rejected') {
    doc.intakeStatus = 'failed'
    doc.intakeReason = 'נדחה על ידי ארי'
    doc.fieldsLocked = true
  } else {
    doc.intakeStatus = 'needs_review'
    doc.intakeReason = 'ארי ביקש מידע נוסף'
  }
  doc.localUpdatedAt = new Date().toISOString()
  return doc
}

export function addDocument(
  input: Omit<StoreDocument, 'id' | 'version' | 'previousId' | 'renewed' | 'createdAt'>,
): StoreDocument {
  const doc: StoreDocument = {
    ...input,
    id: crypto.randomUUID(),
    version: 1,
    previousId: null,
    renewed: false,
    createdAt: new Date().toISOString(),
  }
  ledger.documents.unshift(doc)
  return doc
}

export function setDocumentReminders(
  id: string,
  reminders: { six: string | null; two: string | null },
): StoreDocument {
  const doc = ledger.documents.find((row) => row.id === id)
  if (!doc) throw new Error('מסמך לא נמצא')
  doc.reminderSixAt = reminders.six
  doc.reminderTwoAt = reminders.two
  doc.localUpdatedAt = new Date().toISOString()
  return doc
}

export function setDocumentExpiry(id: string, extractedExpiry: string): StoreDocument {
  const doc = ledger.documents.find((row) => row.id === id)
  if (!doc) throw new Error('מסמך לא נמצא')
  doc.extractedExpiry = extractedExpiry
  doc.fieldsLocked = true
  doc.localUpdatedAt = new Date().toISOString()
  return doc
}

export function renewStoredDocument(
  id: string,
  nextFile: { sourceUrl: string; extractedExpiry: string | null },
) {
  const current = ledger.documents.find((row) => row.id === id)
  if (!current) throw new Error('מסמך לא נמצא')
  const result = renewDocument(current, nextFile)
  result.next.localUpdatedAt = new Date().toISOString()
  result.next.fieldsLocked = true
  Object.assign(current, result.closed)
  ledger.documents.unshift(result.next)
  return result
}

export function listTasks(): OpsTask[] {
  return ledger.tasks
}

export function addTask(input: Omit<OpsTask, 'id' | 'done' | 'createdAt'>): OpsTask {
  const task: OpsTask = {
    ...input,
    id: crypto.randomUUID(),
    done: false,
    createdAt: new Date().toISOString(),
  }
  ledger.tasks.unshift(task)
  return task
}

export function addTasksFromTranscript(
  transcript: string,
  actor: string,
): { tasks: OpsTask[]; spends: SpendRequest[] } {
  const parsed = splitVoiceTranscript(transcript)
  const spends: SpendRequest[] = []
  const tasks = parsed.map((item) => {
    let spendId: string | null = null
    if (item.financial) {
      const spend = createSpend({
        storeId: '',
        storeCode: item.storeHint ?? '',
        storeName: item.storeHint ?? 'לא צוין',
        ticketId: null,
        reason: item.title,
        vendorName: null,
        requestedAmount: 0,
        scope: item.title,
        urgent: false,
        actor,
      })
      spend.status = 'needs_info'
      spends.push(spend)
      spendId = spend.id
    }
    return addTask({
      title: item.title,
      storeId: null,
      storeCode: item.storeHint,
      assignee: item.assigneeHint,
      dueAt: null,
      ticketId: null,
      documentId: null,
      spendId,
      needsClarification: item.needsClarification || item.financial,
      clarification: item.financial
        ? 'בקשה כספית ממתינה לאישור. חסר סכום.'
        : item.clarification,
    })
  })
  return { tasks, spends }
}

export function toggleTask(id: string, done: boolean): OpsTask {
  return setTaskStatus(id, done ? 'done' : 'open')
}

export function setTaskStatus(id: string, status: NonNullable<OpsTask['status']>): OpsTask {
  const task = ledger.tasks.find((row) => row.id === id)
  if (!task) throw new Error('משימה לא נמצאה')
  task.status = status
  task.done = status === 'done'
  task.needsClarification = status === 'waiting'
  if (status === 'waiting' && !task.clarification) task.clarification = 'ממתין להמשך'
  return task
}

export function listFiles(): IngestedFile[] {
  ensureBranchDocuments()
  return ledger.files
}

export function ingestFile(input: {
  name: string
  mime: string
  sourceUrl?: string | null
  storeCodeHint?: string | null
  extractedText?: string | null
  knownStoreCodes: string[]
}): IngestedFile {
  const file = runIngestPipeline({
    id: crypto.randomUUID(),
    name: input.name,
    mime: input.mime,
    sourceUrl: input.sourceUrl,
    storeCodeHint: input.storeCodeHint,
    extractedText: input.extractedText,
    knownStoreCodes: input.knownStoreCodes,
    existingNames: ledger.files.map((row) => row.name),
    stores: ISRAEL_STORES.map((store) => ({
      code: store.code,
      name: store.name,
      city: store.city,
    })),
  })
  ledger.files.unshift(file)
  return file
}

export function noteDriveDeleted(id: string): IngestedFile {
  const file = ledger.files.find((row) => row.id === id)
  if (!file) throw new Error('קובץ לא נמצא')
  Object.assign(file, markSourceDeleted(file))
  return file
}

export function listCatalog(): CatalogItem[] {
  return ledger.catalog
}

export function listStock(): StockQty[] {
  return ledger.stock
}

export function addCatalogItem(name: string, sku: string): CatalogItem {
  const item = { id: crypto.randomUUID(), name: name.trim(), sku: sku.trim() }
  ledger.catalog.push(item)
  return item
}

export function moveStock(movement: Omit<StockMovement, 'id'>): StockQty[] {
  const full = { ...movement, id: crypto.randomUUID() }
  ledger.movements.push(full)
  ledger.stock = applyMovement(ledger.stock, full)
  return ledger.stock
}

export function listOutcomes(): VendorOutcome[] {
  return ledger.outcomes
}

export function addOutcome(outcome: VendorOutcome) {
  ledger.outcomes.push(outcome)
  return outcome
}

export function recordClassificationCorrection(
  ticketId: string,
  from: string,
  to: string,
  detail?: {
    fromCategory?: string
    toCategory?: string
    fromPriority?: string
    toPriority?: string
    reason?: string | null
  },
) {
  ledger.corrections.push({
    id: crypto.randomUUID(),
    ticketId,
    from,
    to,
    at: new Date().toISOString(),
    fromCategory: detail?.fromCategory,
    toCategory: detail?.toCategory,
    fromPriority: detail?.fromPriority ?? from,
    toPriority: detail?.toPriority ?? to,
    reason: detail?.reason ?? null,
  })
}

export function listClassificationCorrections() {
  return ledger.corrections
}
