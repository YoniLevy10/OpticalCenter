import { redirect } from 'next/navigation'
import { OpsAppShell } from '@/components/layout/ops-app-shell'
import { OpsPageHero } from '@/components/ops/ops-page-hero'
import { EmptyState, Panel } from '@/components/ui/primitives'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'
import { getServerActor } from '@/lib/auth/server-actor'
import { shouldAllowDemoEntry } from '@/lib/auth/home-path'
import { listDocuments, listFiles, getDriveSync } from '@/lib/data/ops-ledger'
import { hydrateOpsLedger } from '@/lib/data/ops-db'
import { DOCUMENT_TYPES, documentClock, isDocumentOverdue } from '@/modules/documents/rules'
import { driveCanWrite, driveFolderUrl } from '@/modules/drive/folder'
import { addDocumentAction, ingestFileAction, renewDocumentAction } from '../work-actions'
import { DriveImportForm } from './drive-import-form'

export const dynamic = 'force-dynamic'

const FILE_STATUS = {
  ingested: 'נקלט',
  needs_review: 'דורש בדיקה',
  failed: 'נכשל',
} as const

const CLOCK = {
  extracted: 'תוקף מהמסמך',
  computed: 'מועד מחושב',
  missing: 'אין תאריך',
} as const

export default async function DocumentsPage() {
  const actor = await getServerActor()
  if (!actor && !shouldAllowDemoEntry()) redirect('/login')
  await hydrateOpsLedger()
  const documents = listDocuments()
  const files = listFiles()
  const review = files.filter((file) => file.status !== 'ingested').length
  const sync = getDriveSync()
  const folderId = sync.rootFolderId || process.env.GOOGLE_DRIVE_FOLDER_ID?.trim() || null
  const statusLine = sync.lastSyncAt
    ? `סונכרן לאחרונה ${new Date(sync.lastSyncAt).toLocaleString('he-IL')} · ${sync.lastPulled} מהדרייב · ${sync.lastPushed} לדרייב${sync.lastError ? ` · ${sync.lastError}` : ''}`
    : null

  return (
    <OpsAppShell>
      <div className="mx-auto flex max-w-2xl flex-col gap-5">
        <OpsPageHero
          title="מסמכים ותוקף"
          status={
            review
              ? `${review} קבצים דורשים בדיקה`
              : 'תוקף מהמסמך נשמר בנפרד ממועד שחושב'
          }
        />
        <Panel elevated>
          <h2 className="t-section mb-3 text-ink">גוגל דרייב</h2>
          <DriveImportForm
            connectedFolder={folderId ? driveFolderUrl(folderId) : null}
            statusLine={statusLine}
            canWrite={driveCanWrite()}
          />
        </Panel>
        <Panel elevated>
          <details>
            <summary className="t-body cursor-pointer text-ink">מסמך חדש</summary>
            <form action={addDocumentAction} className="mt-3 grid gap-3">
            <Field label="קוד סניף" htmlFor="doc-store">
              <Input id="doc-store" name="storeCode" placeholder="6018" required />
            </Field>
            <Field label="שם סניף" htmlFor="doc-store-name">
              <Input id="doc-store-name" name="storeName" required />
            </Field>
            <Field label="אחראי חידוש" htmlFor="doc-owner">
              <Input id="doc-owner" name="owner" />
            </Field>
            <Field label="קישור לקובץ המקור" htmlFor="doc-url">
              <Input id="doc-url" name="sourceUrl" dir="ltr" />
            </Field>
            <Field label="תוקף שמופיע במסמך" htmlFor="doc-expiry">
              <Input id="doc-expiry" name="expiry" type="date" />
            </Field>
            <Field label="סוג מסמך" htmlFor="doc-type">
              <select id="doc-type" name="docType" className="h-11 rounded-md border border-border bg-surface px-2">
                {DOCUMENT_TYPES.map((type) => (
                  <option key={type.key} value={type.key}>
                    {type.label}
                  </option>
                ))}
              </select>
            </Field>
            <Button type="submit">שמירת מסמך</Button>
            </form>
          </details>
        </Panel>
        {documents.length === 0 ? (
          <Panel elevated>
            <EmptyState
              title="אין מסמכים במעקב"
              description="חברו את תיקיית הדרייב של ארי, או שמרו מסמך עם קישור למקור."
            />
          </Panel>
        ) : (
          documents.map((doc) => (
            <Panel key={doc.id} elevated>
              <p className="t-body">
                {doc.storeCode || 'בלי סניף'} · {DOCUMENT_TYPES.find((type) => type.key === doc.docType)?.label ?? doc.docType} · גרסה {doc.version}
              </p>
              <p className="t-meta text-ink-2">
                {FILE_STATUS[doc.intakeStatus]}
                {doc.intakeReason ? ` · ${doc.intakeReason}` : ''} · {CLOCK[documentClock(doc)]}
                {isDocumentOverdue(doc) ? ' · באיחור' : ''}
                {doc.renewed ? ' · הוחלף' : ''}
              </p>
              <DocumentPeek name={doc.docType} url={doc.sourceUrl} />
              {!doc.renewed ? (
                <form action={renewDocumentAction} className="mt-3 flex flex-wrap gap-2">
                  <input type="hidden" name="id" value={doc.id} />
                  <Input name="sourceUrl" placeholder="קישור למסמך המעודכן" aria-label="קישור למסמך המעודכן" required />
                  <Input name="expiry" type="date" aria-label="תוקף חדש" />
                  <Button type="submit" size="sm">חידוש</Button>
                </form>
              ) : null}
            </Panel>
          ))
        )}
        <Panel elevated>
          <details>
            <summary className="t-body cursor-pointer text-ink">קליטת קובץ</summary>
            <form action={ingestFileAction} className="mt-3 grid gap-3">
            <Field label="שם קובץ" htmlFor="file-name">
              <Input id="file-name" name="name" required />
            </Field>
            <Field label="קוד סניף" htmlFor="file-store">
              <Input id="file-store" name="storeCode" />
            </Field>
            <Field label="קישור לדרייב" htmlFor="file-url">
              <Input id="file-url" name="sourceUrl" dir="ltr" />
            </Field>
            <Field label="טקסט שחולץ" htmlFor="file-text">
              <Input id="file-text" name="text" />
            </Field>
            <input type="hidden" name="mime" value="application/pdf" />
            <Button type="submit">קליטה</Button>
            </form>
          </details>
          <ul className="mt-4 space-y-3">
            {files.map((file) => (
              <li key={file.id}>
                <p className="t-meta text-ink-2">
                  {file.name} · {FILE_STATUS[file.status]}
                  {file.reason ? ` · ${file.reason}` : ''}
                  {file.deletedInSource ? ' · נמחק במקור' : ''}
                </p>
                <DocumentPeek name={file.name} url={file.sourceUrl} />
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </OpsAppShell>
  )
}

function DocumentPeek({ name, url }: { name: string; url: string | null }) {
  if (!url || url.startsWith('meta-media:')) {
    return <p className="t-meta mt-2 text-ink-3">הקובץ נשמר. אין תצוגה עד שההורדה מוואטסאפ מסתיימת.</p>
  }
  const image = url.startsWith('data:image') || /\.(png|jpe?g|webp|gif)(\?|$)/i.test(url)
  const pdf = url.startsWith('data:application/pdf') || /\.pdf(\?|$)/i.test(url)
  if (image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={url} alt={name} className="mt-3 max-h-64 w-full rounded-md border border-border object-contain" />
    )
  }
  if (pdf) {
    return (
      <iframe title={name} src={url} className="mt-3 h-64 w-full rounded-md border border-border bg-surface" />
    )
  }
  return (
    <a className="t-meta mt-2 inline-block text-ink underline" href={url} target="_blank" rel="noreferrer">
      פתיחת הקובץ
    </a>
  )
}
