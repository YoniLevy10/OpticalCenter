'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { he } from 'date-fns/locale'
import { usePhrase } from '@/components/i18n/locale-provider'
import { EmptyState, Panel, PanelHeader } from '@/components/ui/primitives'
import { cn } from '@/lib/utils'
import type {
  AlertBucket,
  AlertMessage,
  AlertSource,
  AlertSourceHealth,
  OpsAlert,
} from '@/modules/alerts/center'
import { filterAlerts, splitAlertBuckets } from '@/modules/alerts/center'

const BUCKETS: { key: AlertBucket | 'open'; label: string }[] = [
  { key: 'open', label: 'פעולות פתוחות' },
  { key: 'urgent_overdue', label: 'דחוף / באיחור' },
  { key: 'needs_decision', label: 'דורש החלטה' },
  { key: 'waiting', label: 'ממתין למישהו' },
]

const SOURCE_LABEL: Record<AlertSource, string> = {
  ticket: 'תקלה',
  spend: 'הוצאה',
  document: 'מסמך',
  verify: 'אימות',
  task: 'משימה',
  conflict: 'סתירה',
  store_confirm: 'אישור חנות',
}

const SEVERITY_CLASS: Record<OpsAlert['severity'], string> = {
  critical: 'text-[var(--signal-critical)]',
  high: 'text-[var(--signal-warning)]',
  medium: 'text-ink-2',
  low: 'text-ink-3',
}

function fmtWhen(iso: string): string {
  try {
    return format(parseISO(iso), 'd/M HH:mm', { locale: he })
  } catch {
    return iso
  }
}

export function AlertsClient({
  open,
  history,
  sources,
  partialFailure,
}: {
  open: OpsAlert[]
  history: AlertMessage[]
  sources: AlertSourceHealth
  partialFailure: boolean
}) {
  const p = usePhrase()
  const [bucket, setBucket] = useState<AlertBucket | 'open'>('open')
  const [storeCode, setStoreCode] = useState('')
  const [source, setSource] = useState<AlertSource | 'all'>('all')
  const [q, setQ] = useState('')

  const stores = useMemo(() => {
    const map = new Map<string, string>()
    for (const alert of open) {
      if (alert.storeCode && alert.storeCode !== '—') {
        map.set(alert.storeCode, alert.storeName)
      }
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0], 'he'))
  }, [open])

  const filtered = useMemo(
    () =>
      filterAlerts(open, {
        bucket,
        storeCode: storeCode || null,
        source,
        q,
      }),
    [open, bucket, storeCode, source, q],
  )

  const counts = splitAlertBuckets(open)

  return (
    <div className="flex flex-col gap-5">
      {partialFailure ? (
        <div
          role="alert"
          className="rounded-[var(--radius-md)] border border-[color-mix(in_srgb,var(--signal-warning)_45%,var(--border))] bg-[color-mix(in_srgb,var(--signal-warning)_10%,var(--surface))] px-4 py-3"
        >
          <p className="t-body text-ink">
            {p('לא ניתן להציג «הכל שקט» — טעינת מקור נכשלה.')}
          </p>
          <p className="t-meta mt-1 text-ink-2">
            {p('חלק מהמקורות לא נטענו')}
            {' · '}
            תקלות: {sources.tickets === 'failed' ? 'נכשל' : 'תקין'}
            {' · '}
            פנקס: {sources.ledger === 'failed' ? 'נכשל' : 'תקין'}
            {' · '}
            היסטוריה: {sources.history === 'failed' ? 'נכשל' : 'תקין'}
          </p>
        </div>
      ) : null}

      <div
        role="tablist"
        aria-label={p('פעולות פתוחות')}
        className="flex w-full max-w-full gap-0.5 overflow-x-auto rounded-[var(--radius-md)] border border-border bg-[var(--surface-sunken)]/50 p-1"
      >
        {BUCKETS.map((tab) => {
          const selected = bucket === tab.key
          const count =
            tab.key === 'open'
              ? open.length
              : counts[tab.key].length
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={selected}
              className={cn(
                'shrink-0 rounded-[var(--radius-sm)] px-3 py-2 t-meta transition-colors',
                selected
                  ? 'bg-surface text-ink shadow-[var(--shadow-1)]'
                  : 'text-ink-2 hover:text-ink',
              )}
              onClick={() => setBucket(tab.key)}
            >
              {p(tab.label)}
              <span className="ms-1 t-num text-ink-3">{count}</span>
            </button>
          )
        })}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-[10rem] flex-1 flex-col gap-1">
          <span className="t-meta text-ink-3">{p('חיפוש')}</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={p('כותרת, סניף, סיבה…')}
            className="rounded-[var(--radius-md)] border border-border bg-surface px-3 py-2 t-body"
          />
        </label>
        <label className="flex min-w-[8rem] flex-col gap-1">
          <span className="t-meta text-ink-3">{p('סינון לפי חנות')}</span>
          <select
            value={storeCode}
            onChange={(e) => setStoreCode(e.target.value)}
            className="rounded-[var(--radius-md)] border border-border bg-surface px-3 py-2 t-body"
          >
            <option value="">{p('כל הסניפים בהיקף')}</option>
            {stores.map(([code, name]) => (
              <option key={code} value={code}>
                {code} · {name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-[8rem] flex-col gap-1">
          <span className="t-meta text-ink-3">{p('מקור')}</span>
          <select
            value={source}
            onChange={(e) => setSource(e.target.value as AlertSource | 'all')}
            className="rounded-[var(--radius-md)] border border-border bg-surface px-3 py-2 t-body"
          >
            <option value="all">{p('כל המקורות')}</option>
            {(Object.keys(SOURCE_LABEL) as AlertSource[]).map((key) => (
              <option key={key} value={key}>
                {SOURCE_LABEL[key]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <Panel elevated>
        <PanelHeader
          title={p('פעולות פתוחות')}
          meta={String(filtered.length)}
        />
        {!partialFailure && filtered.length === 0 ? (
          <EmptyState title={p('אין פעולות פתוחות')} />
        ) : partialFailure && filtered.length === 0 ? (
          <p className="t-body px-4 py-8 text-ink-2">
            {p('לא ניתן להציג «הכל שקט» — טעינת מקור נכשלה.')}
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((alert) => (
              <li key={alert.id}>
                <Link
                  href={alert.href}
                  className="flex flex-col gap-2 px-4 py-3.5 transition-colors hover:bg-surface-sunken/40"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="t-meta text-ink-3">
                      {alert.storeCode} · {alert.storeName}
                    </span>
                    <span className="t-meta t-num text-ink-3">
                      {fmtWhen(alert.at)}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        't-meta font-medium',
                        SEVERITY_CLASS[alert.severity],
                      )}
                    >
                      {SOURCE_LABEL[alert.source]} · {alert.severity}
                    </span>
                    <span className="t-meta text-ink-2">{alert.owner}</span>
                  </div>
                  <p className="t-lead text-ink">{alert.title}</p>
                  <p className="t-body text-ink-2">
                    <span className="text-ink-3">{p('סיבות')}: </span>
                    {alert.reasons.join(' · ')}
                  </p>
                  <p className="t-meta text-ink">
                    <span className="text-ink-3">{p('פעולה הבאה')}: </span>
                    {alert.nextAction}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel>
        <PanelHeader
          title={p('היסטוריית הודעות')}
          meta={String(history.length)}
        />
        {history.length === 0 ? (
          <p className="t-body px-4 py-6 text-ink-3">
            {partialFailure && sources.history === 'failed'
              ? p('חלק מהמקורות לא נטענו')
              : p('עדיין אין אירועים')}
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {history.slice(0, 40).map((row) => (
              <li key={row.id} className="px-4 py-3">
                {row.href ? (
                  <Link href={row.href} className="flex justify-between gap-3">
                    <span className="t-body text-ink">{row.summary}</span>
                    <span className="t-meta t-num shrink-0 text-ink-3">
                      {fmtWhen(row.at)}
                    </span>
                  </Link>
                ) : (
                  <div className="flex justify-between gap-3">
                    <span className="t-body text-ink">{row.summary}</span>
                    <span className="t-meta t-num shrink-0 text-ink-3">
                      {fmtWhen(row.at)}
                    </span>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  )
}
