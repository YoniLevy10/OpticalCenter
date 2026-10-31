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
import { selectableDocumentTypes } from '@/modules/documents/rules'
import { driveCanWrite, driveFolderUrl } from '@/modules/drive/folder'
import { addDocumentAction, ingestFileAction } from '../work-actions'
import { DocumentCabinet } from './document-cabinet'
import { DriveImportForm } from './drive-import-form'
import { PhoneFold, PhoneFoldStack } from '@/components/layout/phone-fold'

export const dynamic = 'force-dynamic'

export default async function DocumentsPage() {
  const actor = await getServerActor()
  if (!actor && !shouldAllowDemoEntry()) redirect('/login')
  await hydrateOpsLedger()
  const documents = listDocuments()
  const files = listFiles()
  const review = files.filter((file) => file.status !== 'ingested').length
  const folderCount = new Set(documents.map((doc) => doc.storeCode?.trim() || `unassigned:${doc.storeName}`)).size
  const withExpiry = documents.filter((doc) => doc.extractedExpiry).length
  const sync = getDriveSync()
  const folderId = sync.rootFolderId || process.env.GOOGLE_DRIVE_FOLDER_ID?.trim() || null
  const statusLine = sync.lastSyncAt
    ? `סונכרן לאחרונה ${new Date(sync.lastSyncAt).toLocaleString('he-IL')} · ${sync.lastPulled} מהדרייב · ${sync.lastPushed} לדרייב${sync.lastError ? ` · ${sync.lastError}` : ''}`
    : null

  return (
    <OpsAppShell>
      <div className="mx-auto flex max-w-3xl flex-col gap-5">
        <OpsPageHero
          title="מסמכים ותוקף"
          status={
            documents.length
              ? `${folderCount} תיקיות · ${documents.length} מסמכים · ${withExpiry} עם תאריך תוקף`
              : review
                ? `${review} קבצים דורשים בדיקה`
                : 'תוקף מהמסמך נשמר בנפרד ממועד שחושב'
          }
        />
        {documents.length === 0 ? (
          <Panel elevated>
            <EmptyState
              title="אין מסמכים במעקב"
              description="חברו את תיקיית הדרייב של ארי, או שמרו מסמך עם קישור למקור."
            />
          </Panel>
        ) : (
          <DocumentCabinet documents={documents} files={files} />
        )}
        <PhoneFoldStack>
        <PhoneFold title="סנכרון עם גוגל דרייב" summary={statusLine ?? 'לא סונכרן'}>
        <Panel elevated>
          <h2 className="t-section mb-1 text-ink">סנכרון עם גוגל דרייב</h2>
          <p className="t-body mb-4 text-ink-2">
            ארי ממשיך לעבוד בתיקיות. קובץ חדש או עדכון אצלו נכנס לכאן, ומסמך שנשמר כאן נכתב לתיקיית הסניף. עריכה שלו גוברת, וקובץ שלו לא נמחק ולא נדרס. מה שלא ברור נשאר לבדיקה.
          </p>
          <DriveImportForm
            connectedFolder={folderId ? driveFolderUrl(folderId) : null}
            statusLine={statusLine}
            canWrite={driveCanWrite()}
          />
        </Panel>
        </PhoneFold>
        <PhoneFold title="מסמך ידני" summary="לא לשימוש יומיומי">
          <form action={addDocumentAction} className="grid gap-3">
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
                {selectableDocumentTypes().map((type) => (
                  <option key={type.key} value={type.key}>
                    {type.label}
                    {type.hearingCalibration ? ' · כיול שמיעה' : ''}
                  </option>
                ))}
              </select>
            </Field>
            <p className="t-meta text-ink-2">
              כיולי שמיעה: טימפנומטר ואודיומטר כל שנה, תא אקוסטי כל שנתיים. אישור שמכסה כמה כיולים נשמר בנפרד לכל כיול. תזכורת חודש לפני תוקף.
            </p>
            <Button type="submit">שמירת מסמך</Button>
          </form>
        </PhoneFold>
        <PhoneFold title="קליטה ידנית של קובץ" summary="לא לשימוש יומיומי">
          <form action={ingestFileAction} className="grid gap-3">
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
        </PhoneFold>
        </PhoneFoldStack>
      </div>
    </OpsAppShell>
  )
}
