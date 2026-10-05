import { addDocument, ingestFile } from '@/lib/data/ops-ledger'
import type { IngestedFile } from '@/modules/ingestion/pipeline'
import { ISRAEL_STORES, israelStoreId } from '@/modules/stores/israel-stores'
import {
  driveViewUrl,
  listDriveFolder,
  parseDriveLink,
  readDriveFileMeta,
  readDriveText,
  type DriveListedFile,
} from './folder'

export function expiryFromText(text: string | null): string | null {
  if (!text) return null
  const iso = text.match(/(20\d{2})[-/.](\d{2})[-/.](\d{2})/)
  if (iso) {
    const stamp = Date.parse(`${iso[1]}-${iso[2]}-${iso[3]}T00:00:00.000Z`)
    return Number.isNaN(stamp) ? null : new Date(stamp).toISOString()
  }
  const local = text.match(/(\d{1,2})[./](\d{1,2})[./](20\d{2})/)
  if (!local) return null
  const stamp = Date.parse(
    `${local[3]}-${local[2].padStart(2, '0')}-${local[1].padStart(2, '0')}T00:00:00.000Z`,
  )
  return Number.isNaN(stamp) ? null : new Date(stamp).toISOString()
}

export async function importDriveLink(link: string): Promise<{
  files: IngestedFile[]
  review: number
}> {
  const parsed = parseDriveLink(link)
  if (!parsed) throw new Error('הקישור לדרייב לא זוהה. מדביקים קישור לתיקייה או לקובץ.')

  let listed: DriveListedFile[]
  if (parsed.kind === 'folder') {
    listed = await listDriveFolder(parsed.id)
  } else {
    const meta = await readDriveFileMeta(parsed.id)
    listed = [
      meta ?? { id: parsed.id, name: 'קובץ מדרייב', mimeType: 'application/octet-stream' },
    ]
  }
  if (listed.length === 0) {
    throw new Error('התיקייה ריקה, או שאין הרשאה לראות את הקבצים.')
  }

  const codes = ISRAEL_STORES.map((store) => store.code)
  const files: IngestedFile[] = []
  for (const file of listed) {
    const storeCode =
      codes.find((code) => file.name.includes(code) || link.includes(code)) ?? null
    const store = storeCode
      ? ISRAEL_STORES.find((row) => row.code === storeCode)
      : undefined
    const text = await readDriveText(file)
    const ingested = ingestFile({
      name: file.name,
      mime: file.mimeType,
      sourceUrl: driveViewUrl(file.id),
      storeCodeHint: storeCode,
      extractedText: text,
      knownStoreCodes: codes,
    })
    files.push(ingested)
    if (ingested.docType && ingested.docType !== 'inventory') {
      const expiry = expiryFromText(text)
      addDocument({
        storeId: store ? israelStoreId(store.code) : '',
        storeCode: store?.code ?? '',
        storeName: store?.name ?? 'לא שויך',
        docType: ingested.docType,
        sourceUrl: ingested.sourceUrl,
        extractedExpiry: expiry,
        computedNextCheck: null,
        owner: store?.managerName ?? 'ארי',
        intakeStatus: ingested.status === 'failed' ? 'failed' : ingested.status,
        intakeReason: ingested.reason,
      })
    }
  }
  return {
    files,
    review: files.filter((file) => file.status !== 'ingested').length,
  }
}
