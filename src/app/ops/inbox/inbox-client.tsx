'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { RefreshButton } from '@/components/layout/refresh-button'
import { LiveRegion } from '@/components/ui/a11y'
import {
  EmptyState,
  ErrorState,
  Notice,
  Panel,
  PanelHeader,
} from '@/components/ui/primitives'

type Session = {
  wa_id: string
  store_code: string | null
  state: string
  human_takeover?: boolean
  last_inbound?: string | null
  updated_at: string
}

export function InboxClient() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const res = await fetch('/api/inbox/sessions')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'טעינה נכשלה')
      setSessions(json.sessions ?? [])
      setSelected((prev) => prev ?? json.sessions?.[0]?.wa_id ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'טעינה נכשלה')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function toggleTakeover(waId: string, next: boolean) {
    setBusy(true)
    setNotice(null)
    try {
      const res = await fetch('/api/inbox/sessions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wa_id: waId, human_takeover: next }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'עדכון נכשל')
      setNotice(next ? 'השתלטות אנושית פעילה — הבוט מושהה' : 'הוחזר לבוט')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'עדכון נכשל')
    } finally {
      setBusy(false)
    }
  }

  const active = sessions.find((s) => s.wa_id === selected) ?? null

  return (
    <div className="space-y-3">
      <div className="flex justify-end md:hidden">
        <RefreshButton onRefresh={load} />
      </div>
      {error ? (
        <LiveRegion politeness="assertive">
          <ErrorState title="שגיאה" description={error} />
        </LiveRegion>
      ) : null}
      {notice ? (
        <LiveRegion>
          <Notice tone="progress">{notice}</Notice>
        </LiveRegion>
      ) : null}

      <div className="grid gap-4 max-lg:grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)]">
        <Panel flush elevated className="overflow-hidden max-lg:order-2">
          <PanelHeader title="שיחות" meta={`${sessions.length}`} />
          {loading ? (
            <p className="t-body px-4 py-6 text-ink-3">טוען…</p>
          ) : sessions.length === 0 ? (
            <EmptyState title="אין שיחות פעילות" />
          ) : (
            <ul role="listbox" aria-label="רשימת שיחות" className="divide-y divide-border">
              {sessions.map((s) => {
                const isSelected = selected === s.wa_id
                return (
                  <li key={s.wa_id} role="presentation">
                    <button
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => setSelected(s.wa_id)}
                      className={`flex min-h-[var(--tap)] w-full flex-col justify-center gap-0.5 px-4 py-3 text-start transition-colors hover:bg-canvas ${
                        isSelected ? 'bg-[var(--tenant-soft)]' : ''
                      }`}
                    >
                      <span dir="ltr" className="t-body-strong t-num text-ink">
                        {s.wa_id}
                      </span>
                      <span className="t-caption text-ink-2">
                        {s.store_code ? `#${s.store_code}` : 'ללא חנות'} · {s.state}
                        {s.human_takeover ? ' · השתלטות' : ''}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </Panel>

        <Panel elevated aria-label="פרטי שיחה" className="max-lg:order-1">
          {!active ? (
            <EmptyState title="בחרו שיחה" description="מהרשימה" />
          ) : (
            <div className="space-y-4">
              <div>
                <h2 className="t-section text-ink">פרטי שיחה</h2>
                <p dir="ltr" className="t-body t-num mt-1 text-ink-2">
                  {active.wa_id}
                </p>
              </div>
              <dl className="t-body space-y-2 text-ink-2">
                <div className="flex justify-between gap-3">
                  <dt>חנות</dt>
                  <dd className="t-num text-ink">
                    {active.store_code ? (
                      <Link
                        href={`/ops/stores/${encodeURIComponent(active.store_code)}`}
                        className="text-[var(--tenant)] hover:underline"
                      >
                        #{active.store_code}
                      </Link>
                    ) : (
                      '—'
                    )}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt>מצב FSM</dt>
                  <dd className="text-ink">{active.state}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt>עדכון אחרון</dt>
                  <dd className="t-num text-ink">
                    <time dateTime={active.updated_at}>
                      {new Date(active.updated_at).toLocaleString('he-IL')}
                    </time>
                  </dd>
                </div>
              </dl>
              {active.last_inbound ? (
                <div className="rounded-[var(--radius-md)] border border-border bg-surface-sunken/50 px-3 py-2">
                  <p className="t-caption text-ink-3">הודעה אחרונה</p>
                  <p className="t-body mt-1 text-ink">{active.last_inbound}</p>
                </div>
              ) : null}
              <Button
                type="button"
                variant={active.human_takeover ? 'secondary' : 'primary'}
                size="block"
                disabled={busy}
                onClick={() =>
                  void toggleTakeover(active.wa_id, !active.human_takeover)
                }
              >
                {active.human_takeover
                  ? 'החזרה לבוט'
                  : 'השתלטות אנושית'}
              </Button>
              <p className="t-caption text-ink-3">
                במצב השתלטות הבוט לא ממשיך את ה־FSM עד להחזרה. שליחת הודעות
                ידנית דרך Meta תתווסף בהמשך.
              </p>
            </div>
          )}
        </Panel>
      </div>
    </div>
  )
}
