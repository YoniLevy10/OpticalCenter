'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'
import {
  EmptyState,
  ErrorState,
  Notice,
  Panel,
  PanelHeader,
} from '@/components/ui/primitives'
import { WhatsAppShareButton } from '@/components/ui/whatsapp-share-button'
type Snapshot = {
  id: string
  label: string
  period_start: string
  period_end: string
  format: string
  kpis_json: {
    open?: number
    breached?: number
    resolvedCount?: number
    avgResolveHours?: number | null
    pctWithinSla?: number | null
    ticketCount?: number
  }
  created_at: string
}

function shareText(s: Snapshot): string {
  const k = s.kpis_json
  return [
    `MaintainOS · ${s.label}`,
    `תקופה: ${s.period_start} — ${s.period_end}`,
    `פתוחות: ${k.open ?? '—'} · נפתרו: ${k.resolvedCount ?? '—'}`,
    `% בתוך SLA: ${k.pctWithinSla ?? '—'}%`,
  ].join('\n')
}

function downloadHref(s: Snapshot, format: 'csv' | 'xlsx' | 'pdf') {
  const params = new URLSearchParams({
    from: s.period_start,
    to: s.period_end,
    format,
  })
  return `/api/reports/export?${params.toString()}`
}

export function ReportsHistoryClient() {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [month, setMonth] = useState(() => {
    const d = new Date()
    d.setMonth(d.getMonth() - 1)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/reports/snapshots')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'טעינה נכשלה')
      setSnapshots(json.snapshots ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'טעינה נכשלה')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function generate(body: Record<string, string>) {
    setBusy(true)
    setNotice(null)
    setError(null)
    try {
      const res = await fetch('/api/reports/snapshots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, format: 'pdf' }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'יצירה נכשלה')
      setNotice(`נשמר: ${json.snapshot?.label ?? 'דוח'}`)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'יצירה נכשלה')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {error ? <ErrorState title="שגיאה" description={error} /> : null}
      {notice ? <Notice tone="success">{notice}</Notice> : null}

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel elevated className="!p-4 md:!p-5">
          <h2 className="t-section mb-3 text-ink">יצירת דוח חודשי</h2>
          <div className="flex flex-wrap items-end gap-3">
            <Field label="חודש" htmlFor="history-month">
              <Input
                id="history-month"
                type="month"
                dir="ltr"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
              />
            </Field>
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={busy || !month}
              onClick={() => void generate({ month })}
            >
              {busy ? 'יוצר…' : 'יצירה ושמירה'}
            </Button>
          </div>
          <p className="t-caption mt-3 text-ink-3">
            שליחה אוטומטית ב־1 לחודש (06:00 UTC) למייל ההתראות בהגדרות — כולל
            שמירת snapshot ו־PDF.
          </p>
        </Panel>

        <Panel elevated className="!p-4 md:!p-5">
          <h2 className="t-section mb-3 text-ink">יצירה לפי טווח תאריכים</h2>
          <div className="flex flex-wrap items-end gap-3">
            <Field label="מתאריך" htmlFor="history-from">
              <Input
                id="history-from"
                type="date"
                dir="ltr"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </Field>
            <Field label="עד תאריך" htmlFor="history-to">
              <Input
                id="history-to"
                type="date"
                dir="ltr"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </Field>
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={busy || !from || !to}
              onClick={() => void generate({ from, to })}
            >
              {busy ? 'יוצר…' : 'שמירת טווח'}
            </Button>
          </div>
        </Panel>
      </div>

      <Panel flush elevated>
        <PanelHeader
          title="ארכיון שמורים"
          meta={loading ? '…' : String(snapshots.length)}
          action={
            <Button asChild variant="ghost" size="sm">
              <Link href="/ops/reports">סיכום חי</Link>
            </Button>
          }
        />
        {loading ? (
          <p className="t-body px-4 py-8 text-ink-2">טוען…</p>
        ) : snapshots.length === 0 ? (
          <EmptyState
            title="אין דוחות שמורים"
            description="צרו דוח חודשי או טווח תאריכים למעלה — הוא יופיע כאן לצפייה והורדה."
          />
        ) : (
          <ul className="divide-y divide-border">
            {snapshots.map((s) => (
              <li key={s.id} className="space-y-3 px-4 py-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="t-body-strong text-ink">{s.label}</p>
                    <p className="t-caption t-num text-ink-3">
                      {s.period_start} — {s.period_end}
                    </p>
                    <p className="t-meta mt-1 text-ink-2">
                      פתוחות {s.kpis_json.open ?? '—'} · נפתרו{' '}
                      {s.kpis_json.resolvedCount ?? '—'} · SLA{' '}
                      {s.kpis_json.pctWithinSla ?? '—'}%
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button asChild variant="secondary" size="sm">
                      <a href={downloadHref(s, 'pdf')}>PDF</a>
                    </Button>
                    <Button asChild variant="secondary" size="sm">
                      <a href={downloadHref(s, 'xlsx')}>Excel</a>
                    </Button>
                    <Button asChild variant="secondary" size="sm">
                      <a href={downloadHref(s, 'csv')}>CSV</a>
                    </Button>
                    <WhatsAppShareButton
                      prefillText={shareText(s)}
                      label="שיתוף"
                      size="sm"
                    />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  )
}
