import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { ListFinder } from '@/components/ops/list-finder'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { IngestedFile } from '@/modules/ingestion/pipeline'
import {
  documentClock,
  documentReminderStage,
  remindersFor,
  documentTypeLabel,
  isDocumentDueSoon,
  isDocumentOverdue,
  isHearingCalibrationType,
  type StoreDocument,
} from '@/modules/documents/rules'
import { renewDocumentAction, setDocumentExpiryAction, setDocumentRemindersAction } from '../work-actions'
import { PhoneFold, PhoneFoldStack } from '@/components/layout/phone-fold'

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

type Folder = {
  key: string
  code: string
  name: string
  docs: StoreDocument[]
}

export function DocumentCabinet({
  documents,
  files,
}: {
  documents: StoreDocument[]
  files: IngestedFile[]
}) {
  const byId = new Map(files.map((file) => [file.id, file]))
  const filesOnDisk = certificateIds()
  const folders = groupByStore(documents)

  return (
    <ListFinder
      placeholder="חיפוש סניף או מסמך"
      one="תיקייה אחת"
      many="תיקיות"
      className="doc-cabinet"
    >
      <PhoneFoldStack>
      {folders.map((folder) => {
        const dated = folder.docs.filter((doc) => doc.extractedExpiry && !doc.renewed)
        const missing = folder.docs.filter((doc) => !doc.renewed && !doc.extractedExpiry).length
        const next = dated
          .map((doc) => doc.extractedExpiry as string)
          .sort()[0]
        const summary = missing
          ? `${missing} בלי תאריך תוקף`
          : next
            ? `הקרוב ${formatDay(next)}`
            : 'התיקייה מעודכנת'
        return (
          <div
            key={folder.key}
            data-find-group
            data-find-key={folder.key}
            data-find={`${folder.name} ${folder.code}`}
          >
            <PhoneFold
              title={`${folder.name}${folder.code ? ` · ${folder.code}` : ''}`}
              summary={summary}
            >
            <PhoneFoldStack>
              {folder.docs.map((doc) => (
                <Paper
                  key={doc.id}
                  doc={doc}
                  file={byId.get(`file-${doc.id}`) ?? null}
                  fileHref={filesOnDisk.has(doc.id) ? `/api/ops/document-file/${doc.id}` : null}
                />
              ))}
            </PhoneFoldStack>
            </PhoneFold>
          </div>
        )
      })}
      </PhoneFoldStack>
    </ListFinder>
  )
}

function Paper({
  doc,
  file,
  fileHref,
}: {
  doc: StoreDocument
  file: IngestedFile | null
  fileHref: string | null
}) {
  const title = paperTitle(doc, file)
  const typeLabel = documentTypeLabel(doc.docType)
  const excerpt = excerptOf(file?.extractedText)
  const preview = hasPreview(doc.id)
  const expiry = doc.extractedExpiry
  const overdue = isDocumentOverdue(doc)
  const dueSoon = isDocumentDueSoon(doc)
  const expiryId = `expiry-${doc.id}`
  return (
    <article
      className={overdue ? 'doc-page edge edge-overdue' : 'doc-page'}
      data-find-item
      data-find={`${title} ${typeLabel} ${expiry ? formatDay(expiry) : ''} ${expiry?.slice(0, 10) ?? ''}`}
    >
      <span className="doc-page-ear" aria-hidden />
      <p className="doc-page-kicker">
        {isHearingCalibrationType(doc.docType) ? 'כיול שמיעה' : 'אישור'}
        {typeLabel !== title ? ` · ${typeLabel}` : ''}
      </p>
      <h3 className="doc-page-title">
        {fileHref ? (
          <a href={fileHref} target="_blank" rel="noreferrer">
            {title}
            <span className="sr-only">, נפתח בלשונית חדשה</span>
          </a>
        ) : (
          title
        )}
      </h3>
      {expiry ? <p className="doc-page-stamp">תוקף {formatDay(expiry)}</p> : null}
      <PhoneFold title="קובץ והערות" summary={expiry ? formatDay(expiry) : CLOCK[documentClock(doc)]}>
      <div className="doc-page-body">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className="doc-page-scan"
            alt=""
            src={`/api/ops/document-preview/${doc.id}`}
          />
        ) : excerpt ? (
          <p className="doc-page-excerpt">{excerpt}</p>
        ) : (
          <div className="doc-page-lines" aria-hidden>
            <span />
            <span />
            <span />
            <span />
          </div>
        )}
      </div>
      {!doc.renewed ? (
        <form action={setDocumentExpiryAction} className={expiry ? 'doc-expiry-quick' : 'doc-expiry-quick is-open'}>
          <input type="hidden" name="id" value={doc.id} />
          <label className={expiry ? 'sr-only' : 'doc-expiry-label'} htmlFor={expiryId}>
            {expiry ? `תוקף ${title}` : 'תוקף'}
          </label>
          <input
            id={expiryId}
            className="doc-expiry-date"
            type="date"
            name="expiry"
            required
            defaultValue={expiry ? expiry.slice(0, 10) : undefined}
          />
          <Button type="submit" size="sm" aria-label={`שמור תוקף ${title}`}>
            שמור
          </Button>
        </form>
      ) : null}
      <ReminderMenu doc={doc} title={title} />
      <p className="doc-page-foot">
        {FILE_STATUS[doc.intakeStatus]}
        {doc.intakeReason ? ` · ${doc.intakeReason}` : ''} · {CLOCK[documentClock(doc)]}
        {overdue && expiry ? ' · באיחור' : ''}
        {dueSoon ? ' · תזכורת חודש מראש' : ''}
        {doc.renewed ? ' · הוחלף' : ''}
        {fileHref ? (
          <>
            {' · '}
            <a className="underline" href={fileHref} target="_blank" rel="noreferrer">
              פתח את המסמך
              <span className="sr-only">, נפתח בלשונית חדשה</span>
            </a>
          </>
        ) : null}
      </p>
      {!doc.renewed ? (
        <details className="doc-renew">
          <summary>חידוש</summary>
          <form action={renewDocumentAction} className="mt-2 grid gap-2">
            <input type="hidden" name="id" value={doc.id} />
            <Input name="sourceUrl" placeholder="קישור למסמך המעודכן" aria-label="קישור למסמך המעודכן" required />
            <Input name="expiry" type="date" aria-label="תוקף חדש" />
            <Button type="submit" size="sm">
              חידוש
            </Button>
          </form>
        </details>
      ) : null}
      </PhoneFold>
    </article>
  )
}

function ReminderMenu({ doc, title }: { doc: StoreDocument; title: string }) {
  const reminders = remindersFor(doc)
  const six = reminders.find((row) => row.months === 6)?.at
  const two = reminders.find((row) => row.months === 2)?.at
  const stage = documentReminderStage(doc)
  return (
    <details className="doc-reminders">
      <summary>
        {stage === 'two' ? 'תזכורת חודשיים' : stage === 'six' ? 'תזכורת חצי שנה' : 'תזכורות'}
      </summary>
      <form action={setDocumentRemindersAction} className="doc-reminder-form">
        <input type="hidden" name="id" value={doc.id} />
        <ReminderField id={doc.id} label="חצי שנה לפני" name="six" value={six} title={title} />
        <ReminderField id={doc.id} label="חודשיים לפני" name="two" value={two} title={title} />
        {doc.extractedExpiry ? (
          <p className="doc-reminder-empty">שדה ריק חוזר לחישוב לפי תאריך התוקף.</p>
        ) : null}
        <Button type="submit" size="sm" aria-label={`שמור תזכורות ${title}`}>
          שמור
        </Button>
      </form>
    </details>
  )
}

function ReminderField({
  id,
  label,
  name,
  value,
  title,
}: {
  id: string
  label: string
  name: string
  value: string | undefined
  title: string
}) {
  const reached = value ? new Date(value).getTime() <= Date.now() : false
  const fieldId = `${name}-${id}`
  return (
    <div className="doc-reminder-row">
      <label htmlFor={fieldId}>
        {label}
        {reached ? <span className="doc-reminder-flag"> · הגיעה</span> : null}
      </label>
      <input
        id={fieldId}
        className="doc-expiry-date"
        type="date"
        name={name}
        aria-label={`${label} ${title}`}
        defaultValue={value ? value.slice(0, 10) : undefined}
      />
    </div>
  )
}

function groupByStore(documents: StoreDocument[]): Folder[] {
  const map = new Map<string, Folder>()
  for (const doc of documents) {
    const code = doc.storeCode?.trim() ?? ''
    const name = doc.storeName?.trim() || 'בלי סניף'
    const key = code || `unassigned:${name}`
    const folder = map.get(key)
    if (folder) folder.docs.push(doc)
    else map.set(key, { key, code, name, docs: [doc] })
  }
  return [...map.values()]
    .map((folder) => ({
      ...folder,
      docs: [...folder.docs].sort((a, b) => paperTitle(a, null).localeCompare(paperTitle(b, null), 'he')),
    }))
    .sort((a, b) => {
      if (!a.code) return 1
      if (!b.code) return -1
      return a.code.localeCompare(b.code, 'en', { numeric: true })
    })
}

function certificateIds(): Set<string> {
  const file = join(process.cwd(), '.local', 'certificates', 'index.json')
  if (!existsSync(file)) return new Set()
  const parsed = JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>
  return new Set(Object.keys(parsed))
}

function hasPreview(id: string): boolean {
  if (!/^ari-cert-[a-f0-9]{24}$/.test(id)) return false
  return existsSync(join(process.cwd(), '.local', 'doc-previews', `${id}.png`))
}

function paperTitle(doc: StoreDocument, file: IngestedFile | null | undefined): string {
  const fromFile = file?.name?.replace(/\.pdf$/i, '').trim()
  if (fromFile) return fromFile
  return documentTypeLabel(doc.docType)
}

function excerptOf(text: string | null | undefined): string | null {
  if (!text) return null
  const clean = text.replace(/\s+/g, ' ').trim()
  if (clean.length < 12) return null
  return clean.slice(0, 280)
}

function formatDay(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso.slice(0, 10)
  return date.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
