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
import { ComingSoonBadge } from '@/components/ui/coming-soon-badge'

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

export function ReportsHistoryClient() {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [month, setMonth] = useState(() => {
    const d = new Date()
    d.setMonth(d.getMonth() - 1)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
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

  async function generate() {
    setBusy(true)
    setNotice(null)
    setError(null)
    try {
      const res = await fetch('/api/reports/snapshots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month, format: 'pdf' }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'יצירה נכשלה')
      setNotice(`נשמר: ${json.snapshot?.label ?? month}`)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'יצירה נכשלה')
    } finally {
      setBusy(false)
    }
  }

  function downloadSnapshot(s: Snapshot, format: 'csv' | 'xlsx' | 'pdf') {
    const params = new URLSearchParams({
      from: s.period_start,
      to: s.period_end,
      format,
    })
    window.location.href = `/api/reports/export?${params.toString()}`
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button asChild variant="secondary" size="sm">
          <Link href="/ops/reports">סיכום חי</Link>
        </Button>
        <Button asChild variant="primary" size="sm">
          <Link href="/ops/reports/history">היסטוריה</Link>
        </Button>
      </div>

      {error ? <ErrorState title="שגיאה" description={error} /> : null}
      {notice ? <Notice tone="progress">{notice}</Notice> : null}

      <Panel elevated className="!p-4">
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
          <Button type="button" variant="primary" size="sm" disabled={busy} onClick={() => void generate()}>
            {busy ? 'יוצר…' : 'יצירה ושמירה'}
          </Button>
        </div>
        <p className="t-caption mt-3 flex flex-wrap items-center gap-2 text-ink-3">
          <ComingSoonBadge />
          <span>שליחה אוטומטית ב-1 לחודש · email</span>
        </p>
      </Panel>

      <Panel flush elevated>
        <PanelHeader title="דוחות שמורים" meta={loading ? '…' : String(snapshots.length)} />
        {loading ? (
          <p className="t-body px-4 py-8 text-ink-2">טוען…</p>
        ) : snapshots.length === 0 ? (
          <EmptyState
            title="אין דוחות שמורים"
            description="צרו דוח חודשי למעלה — הוא יופיע כאן לצפייה והורדה."
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
                    <Button type="button" variant="secondary" size="sm" onClick={() => downloadSnapshot(s, 'pdf')}>
                      PDF
                    </Button>
                    <Button type="button" variant="secondary" size="sm" onClick={() => downloadSnapshot(s, 'xlsx')}>
                      Excel
                    </Button>
                    <WhatsAppShareButton prefillText={shareText(s)} label="שיתוף" size="sm" />
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
