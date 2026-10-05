import { describe, expect, it } from 'vitest'
import type { StoreDocument } from '@/modules/documents/rules'
import type { IngestedFile } from '@/modules/ingestion/pipeline'
import {
  applyPushResult,
  documentMirrorText,
  planDriveSync,
  resolveStoreCode,
  type RemoteDriveFile,
} from './sync'

const NOW = '2026-10-05T12:00:00.000Z'
const codes = ['6018', '6009', '907001']

function remote(patch: Partial<RemoteDriveFile> & Pick<RemoteDriveFile, 'id' | 'name'>): RemoteDriveFile {
  return {
    mimeType: 'application/pdf',
    modifiedTime: '2026-10-01T00:00:00.000Z',
    text: null,
    storeCode: '6018',
    storeConflict: false,
    origin: 'drive',
    docId: null,
    ...patch,
  }
}

function doc(patch: Partial<StoreDocument> = {}): StoreDocument {
  return {
    id: 'doc-1',
    storeId: 'il-store-6018',
    storeCode: '6018',
    storeName: 'כרמיאל',
    docType: 'fire',
    sourceUrl: null,
    extractedExpiry: '2027-01-15T00:00:00.000Z',
    computedNextCheck: null,
    owner: 'איה',
    intakeStatus: 'ingested',
    intakeReason: null,
    version: 1,
    previousId: null,
    renewed: false,
    createdAt: NOW,
    fieldsLocked: true,
    localUpdatedAt: NOW,
    ...patch,
  }
}

function plan(input: {
  remote?: RemoteDriveFile[]
  localFiles?: IngestedFile[]
  localDocs?: StoreDocument[]
  canWrite?: boolean
  complete?: boolean
}) {
  let n = 0
  return planDriveSync({
    remote: input.remote ?? [],
    localFiles: input.localFiles ?? [],
    localDocs: input.localDocs ?? [],
    knownCodes: codes,
    canWrite: input.canWrite ?? false,
    complete: input.complete ?? true,
    now: NOW,
    idFactory: () => `id-${++n}`,
  })
}

describe('resolveStoreCode', () => {
  it('reads a store code from the file name', () => {
    expect(resolveStoreCode({ fileName: 'כיבוי-6018.pdf', ancestors: [], knownCodes: codes })).toEqual({
      storeCode: '6018',
      conflict: false,
    })
  })

  it('inherits the store from the folder Ari keeps', () => {
    expect(
      resolveStoreCode({ fileName: 'כיבוי.pdf', ancestors: ['6018 כרמיאל'], knownCodes: codes }),
    ).toEqual({ storeCode: '6018', conflict: false })
  })

  it('does not pick a store when the name and the folder disagree', () => {
    expect(
      resolveStoreCode({
        fileName: 'כיבוי-6009.pdf',
        ancestors: ['6018 כרמיאל'],
        knownCodes: codes,
      }),
    ).toEqual({ storeCode: null, conflict: true })
  })
})

describe('planDriveSync', () => {
  it('pulls a clear file into a document and leaves his file untouched', () => {
    const result = plan({
      remote: [
        remote({
          id: 'file-1',
          name: 'כיבוי-6018.pdf',
          text: 'בדיקה בתוקף עד 2027-01-15',
        }),
      ],
      canWrite: true,
    })
    expect(result.pulled).toBe(1)
    expect(result.pushes).toHaveLength(0)
    expect(result.files[0]).toMatchObject({
      driveFileId: 'file-1',
      origin: 'drive',
      storeCode: '6018',
      status: 'ingested',
    })
    expect(result.documents[0]).toMatchObject({
      storeCode: '6018',
      docType: 'fire',
      fieldsLocked: false,
      driveFileId: 'file-1',
    })
    expect(result.documents[0]?.extractedExpiry?.slice(0, 10)).toBe('2027-01-15')
  })

  it('keeps a locked expiry when Ari changes the date in Drive', () => {
    const first = plan({
      remote: [
        remote({
          id: 'file-1',
          name: 'כיבוי-6018.pdf',
          text: 'תוקף 2027-01-15',
          modifiedTime: '2026-10-01T00:00:00.000Z',
        }),
      ],
    })
    const locked = { ...first.documents[0]!, fieldsLocked: true }
    const again = plan({
      remote: [
        remote({
          id: 'file-1',
          name: 'כיבוי-6018.pdf',
          text: 'תוקף 2028-05-01',
          modifiedTime: '2026-10-04T00:00:00.000Z',
        }),
      ],
      localFiles: first.files,
      localDocs: [locked],
    })
    expect(again.documents[0]?.extractedExpiry?.slice(0, 10)).toBe('2027-01-15')
    expect(again.files[0]).toMatchObject({
      status: 'needs_review',
      reason: 'התאריך בדרייב שונה מהתאריך שננעל ידנית',
    })
    expect(again.pushes).toHaveLength(0)
  })

  it('writes a document saved here into the store folder', () => {
    const saved = doc()
    const result = plan({ localDocs: [saved], canWrite: true })
    expect(result.pushes).toEqual([
      {
        docId: 'doc-1',
        fileName: 'כיבוי-6018.txt',
        folderName: '6018 כרמיאל',
        storeCode: '6018',
        text: documentMirrorText(saved),
        existingFileId: null,
      },
    ])
  })

  it('does not overwrite a file Ari already keeps in Drive', () => {
    const saved = doc({
      driveFileId: 'his-file',
      sourceUrl: 'https://drive.google.com/file/d/his-file/view',
      localUpdatedAt: '2026-10-05T00:00:00.000Z',
    })
    const his: IngestedFile = {
      id: 'local',
      name: 'כיבוי-6018.pdf',
      mime: 'application/pdf',
      sourceUrl: 'https://drive.google.com/file/d/his-file/view',
      stage: 'validate',
      docType: 'fire',
      storeCode: '6018',
      extractedText: 'תוקף 2027-01-15',
      status: 'ingested',
      reason: null,
      versionOf: null,
      deletedInSource: false,
      driveFileId: 'his-file',
      driveModifiedTime: '2026-10-01T00:00:00.000Z',
      origin: 'drive',
      localUpdatedAt: '2026-10-01T00:00:00.000Z',
    }
    const result = plan({
      canWrite: true,
      localDocs: [saved],
      localFiles: [his],
      remote: [remote({ id: 'his-file', name: 'כיבוי-6018.pdf', modifiedTime: '2026-10-01T00:00:00.000Z' })],
    })
    expect(result.pushes).toHaveLength(0)
  })

  it('marks a file missing from Drive and does not delete it remotely', () => {
    const his: IngestedFile = {
      id: 'local',
      name: 'כיבוי-6018.pdf',
      mime: 'application/pdf',
      sourceUrl: 'https://drive.google.com/file/d/gone/view',
      stage: 'validate',
      docType: 'fire',
      storeCode: '6018',
      extractedText: null,
      status: 'ingested',
      reason: null,
      versionOf: null,
      deletedInSource: false,
      driveFileId: 'gone',
      driveModifiedTime: '2026-10-01T00:00:00.000Z',
      origin: 'drive',
      localUpdatedAt: '2026-10-01T00:00:00.000Z',
    }
    const result = plan({ localFiles: [his], canWrite: true })
    expect(result.removed).toBe(1)
    expect(result.files[0]?.deletedInSource).toBe(true)
    expect(result.pushes).toHaveLength(0)
  })

  it('takes his newer edit of a file we created', () => {
    const ours: IngestedFile = {
      id: 'local',
      name: 'כיבוי-6018.txt',
      mime: 'text/plain',
      sourceUrl: 'https://drive.google.com/file/d/ours/view',
      stage: 'validate',
      docType: 'fire',
      storeCode: '6018',
      extractedText: 'תוקף: 2027-01-15',
      status: 'ingested',
      reason: null,
      versionOf: null,
      deletedInSource: false,
      driveFileId: 'ours',
      driveModifiedTime: '2026-10-01T00:00:00.000Z',
      origin: 'maintainos',
      localUpdatedAt: '2026-10-01T00:00:00.000Z',
    }
    const saved = doc({
      driveFileId: 'ours',
      fieldsLocked: false,
      localUpdatedAt: '2026-10-01T00:00:00.000Z',
      extractedExpiry: '2027-01-15T00:00:00.000Z',
    })
    const result = plan({
      canWrite: true,
      localFiles: [ours],
      localDocs: [saved],
      remote: [
        remote({
          id: 'ours',
          name: 'כיבוי-6018.txt',
          mimeType: 'text/plain',
          origin: 'maintainos',
          docId: 'doc-1',
          modifiedTime: '2026-10-04T00:00:00.000Z',
          text: 'סניף 6018\nסוג: כיבוי אש\nתוקף: 2028-02-01\nאחראי: איה\nמזהה: doc-1',
        }),
      ],
    })
    expect(result.pulled).toBe(1)
    expect(result.pushes).toHaveLength(0)
    expect(result.documents[0]?.extractedExpiry?.slice(0, 10)).toBe('2028-02-01')
  })

  it('stops pushing after the written file is recorded', () => {
    const saved = doc()
    const first = plan({ localDocs: [saved], canWrite: true })
    const applied = applyPushResult(first.files, first.documents, first.pushes[0]!, {
      id: 'new-file',
      modifiedTime: NOW,
    }, () => 'file-row')
    const second = plan({
      canWrite: true,
      localFiles: applied.files,
      localDocs: applied.documents,
      remote: [
        remote({
          id: 'new-file',
          name: 'כיבוי-6018.txt',
          mimeType: 'text/plain',
          origin: 'maintainos',
          docId: 'doc-1',
          modifiedTime: NOW,
          text: documentMirrorText(saved),
          storeCode: '6018',
        }),
      ],
    })
    expect(second.pushes).toHaveLength(0)
    expect(second.pulled).toBe(0)
  })
})
