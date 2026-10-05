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
  corrections: { id: string; ticketId: string; from: string; to: string; at: string }[]
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
  return [...byPhone.values()]
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

let ledger = seedLedger()
ensureTrialSpends()

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
    reason: input.reason,
    vendorName: input.vendorName,
    requestedAmount: input.requestedAmount,
    approvedAmount: null,
    actualAmount: null,
    scope: input.scope,
    status: 'pending',
    urgent: input.urgent,
    requestedBy: input.requestedBy ?? input.actor,
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

export function listDocuments(): StoreDocument[] {
  return ledger.documents
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
  const task = ledger.tasks.find((row) => row.id === id)
  if (!task) throw new Error('משימה לא נמצאה')
  task.done = done
  return task
}

export function listFiles(): IngestedFile[] {
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

export function recordClassificationCorrection(ticketId: string, from: string, to: string) {
  ledger.corrections.push({
    id: crypto.randomUUID(),
    ticketId,
    from,
    to,
    at: new Date().toISOString(),
  })
}

export function listClassificationCorrections() {
  return ledger.corrections
}
