import {
  applyDriveMirror,
  getDriveSync,
  listDocuments,
  listFiles,
  setDriveSync,
  type DriveSyncState,
} from '@/lib/data/ops-ledger'
import type { StoreDocument } from '@/modules/documents/rules'
import { DOCUMENT_TYPES } from '@/modules/documents/rules'
import { markSourceDeleted, runIngestPipeline, type IngestedFile } from '@/modules/ingestion/pipeline'
import { ISRAEL_STORES, israelStoreId } from '@/modules/stores/israel-stores'
import { expiryFromText } from './import'
import {
  DRIVE_FOLDER_MIME,
  createDriveFolder,
  driveCanWrite,
  driveViewUrl,
  listDriveTree,
  readDriveText,
  writeDriveTextFile,
  type DriveListedFile,
} from './folder'

export type RemoteDriveFile = {
  id: string
  name: string
  mimeType: string
  modifiedTime: string
  text: string | null
  storeCode: string | null
  storeConflict: boolean
  origin: 'drive' | 'maintainos'
  docId: string | null
}

export type DrivePush = {
  docId: string
  fileName: string
  folderName: string
  storeCode: string
  text: string
  existingFileId: string | null
}

export type DriveSyncPlan = {
  files: IngestedFile[]
  documents: StoreDocument[]
  pushes: DrivePush[]
  pulled: number
  review: number
  removed: number
}

export type DriveSyncReport = {
  folderId: string
  pulled: number
  pushed: number
  review: number
  removed: number
  writeSkipped: boolean
  complete: boolean
}

const SHORT_TYPE: Record<string, string> = {
  fire: 'כיבוי',
  electrical: 'חשמל',
  hearing: 'שמיעה',
}

export function resolveStoreCode(input: {
  fileName: string
  ancestors: string[]
  knownCodes: string[]
}): { storeCode: string | null; conflict: boolean } {
  const codes = [...input.knownCodes].sort((a, b) => b.length - a.length)
  const found = (name: string) => codes.find((code) => name.includes(code)) ?? null
  const fromName = found(input.fileName)
  const fromFolder = input.ancestors.map(found).find((code): code is string => Boolean(code)) ?? null
  if (fromName && fromFolder && fromName !== fromFolder) {
    return { storeCode: null, conflict: true }
  }
  return { storeCode: fromName ?? fromFolder, conflict: false }
}

export function ancestorNames(
  parents: string[] | undefined,
  folders: ReadonlyMap<string, { name: string; parents: string[] }>,
): string[] {
  const names: string[] = []
  const seen = new Set<string>()
  let next = parents?.[0]
  while (next && !seen.has(next)) {
    seen.add(next)
    const folder = folders.get(next)
    if (!folder) break
    names.push(folder.name)
    next = folder.parents[0]
  }
  return names
}

export function mirrorFileName(docType: string, storeCode: string): string {
  const label = SHORT_TYPE[docType] ?? docType
  return storeCode ? `${label}-${storeCode}.txt` : `${label}.txt`
}

export function mirrorFolderName(storeCode: string, storeName: string): string {
  if (!storeCode) return 'לבדיקה'
  return `${storeCode} ${storeName}`.trim()
}

export function documentMirrorText(doc: StoreDocument): string {
  const type = DOCUMENT_TYPES.find((row) => row.key === doc.docType)?.label ?? doc.docType
  const expiry = doc.extractedExpiry ? doc.extractedExpiry.slice(0, 10) : ''
  return [
    `סניף ${doc.storeCode} ${doc.storeName}`.trim(),
    `סוג: ${type}`,
    `תוקף: ${expiry}`,
    `אחראי: ${doc.owner ?? ''}`,
    `מזהה: ${doc.id}`,
  ].join('\n')
}

function isNewer(left: string, right: string): boolean {
  const a = Date.parse(left)
  const b = Date.parse(right)
  if (Number.isNaN(a) || Number.isNaN(b)) return left > right
  return a > b
}

function storeMeta(code: string | null) {
  const store = code ? ISRAEL_STORES.find((row) => row.code === code) : undefined
  return {
    storeId: store ? israelStoreId(store.code) : '',
    storeName: store?.name ?? 'לא שויך',
    owner: store?.managerName ?? 'ארי',
  }
}

function ownerFromText(text: string | null, fallback: string): string {
  const match = text?.match(/אחראי:\s*(.+)/)
  const name = match?.[1]?.trim()
  return name || fallback
}

export function planDriveSync(input: {
  remote: RemoteDriveFile[]
  localFiles: IngestedFile[]
  localDocs: StoreDocument[]
  knownCodes: string[]
  canWrite: boolean
  complete: boolean
  now: string
  idFactory?: () => string
}): DriveSyncPlan {
  const idFactory = input.idFactory ?? (() => crypto.randomUUID())
  const files = input.localFiles.map((file) => ({ ...file }))
  const documents = input.localDocs.map((doc) => ({ ...doc }))
  const remoteIds = new Set(input.remote.map((file) => file.id))
  let pulled = 0
  let review = 0
  let removed = 0

  const rememberReview = (file: IngestedFile, wasReview: boolean) => {
    if (!wasReview && file.status !== 'ingested') review += 1
  }

  for (const remote of input.remote) {
    const local = files.find(
      (file) => file.driveFileId === remote.id || file.sourceUrl?.includes(`/file/d/${remote.id}/`),
    )
    if (!local) {
      const created = ingestRemote(remote, files, input.knownCodes, idFactory)
      files.unshift(created)
      pulled += 1
      rememberReview(created, false)
      if (!remote.storeConflict) linkDocument(documents, created, remote, input.now, idFactory)
      continue
    }
    const wasReview = local.status !== 'ingested'
    if (!local.driveModifiedTime) {
      local.driveFileId = remote.id
      local.driveModifiedTime = remote.modifiedTime
      local.origin = local.origin ?? remote.origin
      continue
    }
    if (!isNewer(remote.modifiedTime, local.driveModifiedTime)) continue
    const fresh = ingestRemote(remote, files.filter((file) => file.id !== local.id), input.knownCodes, () => local.id)
    const locked = documents.find((doc) => doc.driveFileId === remote.id && doc.fieldsLocked)
    local.name = fresh.name
    local.mime = fresh.mime
    local.sourceUrl = fresh.sourceUrl
    local.extractedText = fresh.extractedText
    local.docType = locked ? local.docType : fresh.docType
    local.storeCode = locked ? local.storeCode : fresh.storeCode
    local.versionOf = fresh.versionOf
    local.deletedInSource = false
    local.driveFileId = remote.id
    local.driveModifiedTime = remote.modifiedTime
    local.localUpdatedAt = remote.modifiedTime
    local.origin = remote.origin === 'maintainos' ? 'maintainos' : local.origin ?? 'drive'
    if (locked) {
      const incoming = expiryFromText(remote.text)
      const changed = incoming && locked.extractedExpiry && incoming.slice(0, 10) !== locked.extractedExpiry.slice(0, 10)
      local.status = 'needs_review'
      local.reason = changed
        ? 'התאריך בדרייב שונה מהתאריך שננעל ידנית'
        : 'הקובץ עודכן בדרייב אחרי נעילה ידנית'
      locked.intakeStatus = 'needs_review'
      locked.intakeReason = local.reason
    } else {
      local.status = fresh.status
      local.reason = fresh.reason
      if (!remote.storeConflict) linkDocument(documents, local, remote, input.now, idFactory)
    }
    pulled += 1
    rememberReview(local, wasReview)
  }

  if (input.complete) {
    for (const local of files) {
      if (!local.driveFileId || local.deletedInSource) continue
      if (remoteIds.has(local.driveFileId)) continue
      Object.assign(local, markSourceDeleted(local))
      removed += 1
    }
  }

  const pushes = input.canWrite ? documents.flatMap((doc) => pushFor(doc, files, input.remote)) : []
  return { files, documents, pushes, pulled, review, removed }
}

function ingestRemote(
  remote: RemoteDriveFile,
  existing: IngestedFile[],
  knownCodes: string[],
  idFactory: () => string,
): IngestedFile {
  const file = runIngestPipeline({
    id: idFactory(),
    name: remote.name,
    mime: remote.mimeType,
    sourceUrl: driveViewUrl(remote.id),
    storeCodeHint: remote.storeConflict ? null : remote.storeCode,
    extractedText: remote.text,
    knownStoreCodes: knownCodes,
    existingNames: existing.map((row) => row.name),
  })
  file.driveFileId = remote.id
  file.driveModifiedTime = remote.modifiedTime
  file.origin = remote.origin
  file.localUpdatedAt = remote.modifiedTime
  if (remote.storeConflict) {
    file.storeCode = null
    file.status = 'needs_review'
    file.reason = 'שם הקובץ והתיקייה מצביעים על סניפים שונים'
  }
  return file
}

function linkDocument(
  documents: StoreDocument[],
  file: IngestedFile,
  remote: RemoteDriveFile,
  now: string,
  idFactory: () => string,
) {
  if (!file.docType || file.docType === 'inventory') return
  const meta = storeMeta(file.storeCode)
  const expiry = file.status === 'ingested' ? expiryFromText(remote.text) : null
  const existing =
    documents.find((doc) => doc.driveFileId === remote.id && !doc.renewed) ??
    documents.find((doc) => remote.docId && doc.id === remote.docId && !doc.renewed)
  if (existing) {
    if (existing.fieldsLocked) return
    existing.storeId = file.storeCode ? meta.storeId : existing.storeId
    existing.storeCode = file.storeCode ?? existing.storeCode
    existing.storeName = file.storeCode ? meta.storeName : existing.storeName
    existing.docType = file.docType
    existing.sourceUrl = file.sourceUrl
    existing.driveFileId = remote.id
    if (expiry) existing.extractedExpiry = expiry
    existing.owner = ownerFromText(remote.text, existing.owner || meta.owner)
    existing.intakeStatus = file.status === 'failed' ? 'failed' : file.status
    existing.intakeReason = file.reason
    existing.localUpdatedAt = remote.modifiedTime
    return
  }
  documents.unshift({
    id: idFactory(),
    storeId: meta.storeId,
    storeCode: file.storeCode ?? '',
    storeName: meta.storeName,
    docType: file.docType,
    sourceUrl: file.sourceUrl,
    extractedExpiry: expiry,
    computedNextCheck: null,
    owner: ownerFromText(remote.text, meta.owner),
    intakeStatus: file.status === 'failed' ? 'failed' : file.status,
    intakeReason: file.reason,
    version: 1,
    previousId: null,
    renewed: false,
    createdAt: now,
    driveFileId: remote.id,
    fieldsLocked: false,
    localUpdatedAt: remote.modifiedTime,
  })
}

function pushFor(doc: StoreDocument, files: IngestedFile[], remote: RemoteDriveFile[]): DrivePush[] {
  if (doc.renewed) return []
  const linked = files.find((file) => doc.driveFileId && file.driveFileId === doc.driveFileId)
  const remoteFile = remote.find((file) => file.id === doc.driveFileId)
  if (doc.driveFileId) {
    if (!linked || linked.origin !== 'maintainos' || linked.deletedInSource) return []
    if (remoteFile && remoteFile.origin !== 'maintainos') return []
    if (remoteFile && !isNewer(doc.localUpdatedAt ?? '', remoteFile.modifiedTime)) return []
  } else if (doc.sourceUrl?.includes('drive.google.com')) {
    return []
  }
  return [
    {
      docId: doc.id,
      fileName: mirrorFileName(doc.docType, doc.storeCode),
      folderName: mirrorFolderName(doc.storeCode, doc.storeName),
      storeCode: doc.storeCode,
      text: documentMirrorText(doc),
      existingFileId: linked?.origin === 'maintainos' ? linked.driveFileId : null,
    },
  ]
}

export function applyPushResult(
  files: IngestedFile[],
  documents: StoreDocument[],
  push: DrivePush,
  wrote: { id: string; modifiedTime: string },
  idFactory: () => string = () => crypto.randomUUID(),
): { files: IngestedFile[]; documents: StoreDocument[] } {
  const nextFiles = files.map((file) => ({ ...file }))
  const nextDocs = documents.map((doc) => ({ ...doc }))
  const doc = nextDocs.find((row) => row.id === push.docId)
  if (!doc) return { files: nextFiles, documents: nextDocs }
  doc.driveFileId = wrote.id
  doc.sourceUrl = driveViewUrl(wrote.id)
  doc.localUpdatedAt = wrote.modifiedTime
  const existing = nextFiles.find((file) => file.driveFileId === wrote.id || file.driveFileId === push.existingFileId)
  if (existing) {
    existing.driveFileId = wrote.id
    existing.driveModifiedTime = wrote.modifiedTime
    existing.localUpdatedAt = wrote.modifiedTime
    existing.origin = 'maintainos'
    existing.sourceUrl = driveViewUrl(wrote.id)
    existing.name = push.fileName
    existing.extractedText = push.text
    existing.deletedInSource = false
    return { files: nextFiles, documents: nextDocs }
  }
  nextFiles.unshift({
    id: idFactory(),
    name: push.fileName,
    mime: 'text/plain',
    sourceUrl: driveViewUrl(wrote.id),
    stage: 'validate',
    docType: doc.docType,
    storeCode: doc.storeCode || null,
    extractedText: push.text,
    status: doc.intakeStatus === 'failed' ? 'failed' : doc.intakeStatus,
    reason: doc.intakeReason,
    versionOf: null,
    deletedInSource: false,
    driveFileId: wrote.id,
    driveModifiedTime: wrote.modifiedTime,
    origin: 'maintainos',
    localUpdatedAt: wrote.modifiedTime,
  })
  return { files: nextFiles, documents: nextDocs }
}

function remoteFromListed(
  nodes: DriveListedFile[],
  texts: Map<string, string | null>,
  knownCodes: string[],
): RemoteDriveFile[] {
  const folders = new Map<string, { name: string; parents: string[] }>()
  for (const node of nodes) {
    if (node.mimeType !== DRIVE_FOLDER_MIME) continue
    folders.set(node.id, { name: node.name, parents: node.parents ?? [] })
  }
  return nodes
    .filter((node) => node.mimeType !== DRIVE_FOLDER_MIME && !node.trashed)
    .map((node) => {
      const place = resolveStoreCode({
        fileName: node.name,
        ancestors: ancestorNames(node.parents, folders),
        knownCodes,
      })
      const origin = node.appProperties?.origin === 'maintainos' ? 'maintainos' : 'drive'
      return {
        id: node.id,
        name: node.name,
        mimeType: node.mimeType,
        modifiedTime: node.modifiedTime ?? new Date(0).toISOString(),
        text: texts.get(node.id) ?? null,
        storeCode: place.storeCode,
        storeConflict: place.conflict,
        origin,
        docId: node.appProperties?.docId ?? null,
      }
    })
}

export async function syncDriveFolder(folderId: string): Promise<DriveSyncReport> {
  const knownCodes = ISRAEL_STORES.map((store) => store.code)
  const previous = getDriveSync()
  try {
    const tree = await listDriveTree(folderId)
    setDriveSync({ ...previous, rootFolderId: folderId, lastError: null })
    const locals = listFiles()
    const needsText = tree.files.filter((node) => {
      if (node.mimeType === DRIVE_FOLDER_MIME) return false
      const local = locals.find((file) => file.driveFileId === node.id)
      if (!local?.driveModifiedTime) return true
      return isNewer(node.modifiedTime ?? '', local.driveModifiedTime)
    })
    const texts = new Map<string, string | null>()
    for (const node of needsText) {
      texts.set(node.id, await readDriveText(node))
    }
    let plan = planDriveSync({
      remote: remoteFromListed(tree.files, texts, knownCodes),
      localFiles: locals,
      localDocs: listDocuments(),
      knownCodes,
      canWrite: driveCanWrite(),
      complete: tree.complete,
      now: new Date().toISOString(),
    })
    let pushed = 0
    let writeError: string | null = null
    for (const push of plan.pushes) {
      try {
        const parentId = await ensureStoreFolder(folderId, tree.files, push.folderName, push.storeCode)
        const wrote = await writeDriveTextFile({
          parentId,
          name: push.fileName,
          text: push.text,
          fileId: push.existingFileId,
          appProperties: {
            origin: 'maintainos',
            docId: push.docId,
            maintainos: '1',
          },
        })
        const applied = applyPushResult(plan.files, plan.documents, push, {
          id: wrote.id,
          modifiedTime: wrote.modifiedTime ?? new Date().toISOString(),
        })
        plan = { ...plan, files: applied.files, documents: applied.documents }
        pushed += 1
      } catch (err) {
        writeError = err instanceof Error ? err.message : 'הכתיבה לדרייב נכשלה'
        break
      }
    }
    applyDriveMirror(plan.files, plan.documents)
    const state: DriveSyncState = {
      rootFolderId: folderId,
      lastSyncAt: new Date().toISOString(),
      lastError: writeError,
      lastPulled: plan.pulled,
      lastPushed: pushed,
      lastReview: plan.review,
    }
    setDriveSync(state)
    return {
      folderId,
      pulled: plan.pulled,
      pushed,
      review: plan.review,
      removed: plan.removed,
      writeSkipped: !driveCanWrite(),
      complete: tree.complete,
    }
  } catch (err) {
    setDriveSync(previous)
    throw err
  }
}

async function ensureStoreFolder(
  rootId: string,
  nodes: DriveListedFile[],
  name: string,
  storeCode: string,
): Promise<string> {
  const children = nodes.filter(
    (node) => node.mimeType === DRIVE_FOLDER_MIME && (node.parents ?? []).includes(rootId),
  )
  const exact = children.find((node) => node.name === name)
  const byCode = storeCode ? children.find((node) => node.name.includes(storeCode)) : undefined
  const existing = exact ?? byCode
  if (existing) return existing.id
  const created = await createDriveFolder(rootId, name)
  nodes.push({ ...created, mimeType: DRIVE_FOLDER_MIME, parents: [rootId] })
  return created.id
}
