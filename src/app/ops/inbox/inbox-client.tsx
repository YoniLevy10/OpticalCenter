'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Field, Textarea } from '@/components/ui/input'
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
  country_id?: string
}

type ThreadMessage = {
  id: string
  direction: 'inbound' | 'outbound'
  body: string
  created_at: string
  ticket_id?: string | null
}

export function InboxClient() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [messages, setMessages] = useState<ThreadMessage[]>([])
  const [ticketIds, setTicketIds] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)
  const [reply, setReply] = useState('')

  const loadSessions = useCallback(async () => {
    setError(null)
    try {
      const res = await fetch('/api/inbox/sessions')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'טעינה נכשלה')
      setSessions(json.sessions ?? [])
      if (!selected && json.sessions?.[0]) setSelected(json.sessions[0].wa_id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'טעינה נכשלה')
    }
  }, [selected])

  const loadThread = useCallback(async (waId: string) => {
    try {
      const res = await fetch(`/api/inbox/sessions/${encodeURIComponent(waId)}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'טעינת שיחה נכשלה')
      setMessages(json.messages ?? [])
      setTicketIds(json.ticketIds ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'טעינת שיחה נכשלה')
    }
  }, [])

  useEffect(() => {
    void loadSessions()
  }, [loadSessions])

  useEffect(() => {
    if (selected) void loadThread(selected)
  }, [selected, loadThread])

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
      await loadSessions()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'עדכון נכשל')
    } finally {
      setBusy(false)
    }
  }

  async function sendReply() {
    if (!selected || !reply.trim()) return
    setBusy(true)
    setNotice(null)
    setError(null)
    try {
      const active = sessions.find((s) => s.wa_id === selected)
      const res = await fetch(
        `/api/inbox/sessions/${encodeURIComponent(selected)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: reply.trim(),
            ticketId: ticketIds[0] ?? null,
            countryId: active?.country_id,
          }),
        },
      )
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'שליחה נכשלה')
      setReply('')
      setNotice(json.send?.dryRun ? 'נשלח (מצב דמו)' : 'הודעה נשלחה')
      await loadThread(selected)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שליחה נכשלה')
    } finally {
      setBusy(false)
    }
  }

  const active = sessions.find((s) => s.wa_id === selected) ?? null

  return (
    <div className="flex flex-col gap-3">
      {error ? <ErrorState title="שגיאה" description={error} /> : null}
      {notice ? <Notice tone="progress">{notice}</Notice> : null}

      <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <Panel flush elevated className="overflow-hidden">
          <PanelHeader title="שיחות" meta={`${sessions.length}`} />
          {sessions.length === 0 ? (
            <EmptyState title="אין שיחות פעילות" />
          ) : (
            <ul className="divide-y divide-border">
              {sessions.map((s) => (
                <li key={s.wa_id}>
                  <button
                    type="button"
                    onClick={() => setSelected(s.wa_id)}
                    className={`flex w-full flex-col gap-0.5 px-4 py-3 text-start transition-colors hover:bg-canvas ${
                      selected === s.wa_id ? 'bg-[var(--tenant-soft)]' : ''
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
              ))}
            </ul>
          )}
        </Panel>

        <Panel elevated className="flex min-h-[420px] flex-col">
          {!active ? (
            <EmptyState title="בחרו שיחה" description="מהרשימה" />
          ) : (
            <>
              <div className="border-b border-border px-4 py-3">
                <h2 className="t-section text-ink">שיחה</h2>
                <p dir="ltr" className="t-body t-num mt-1 text-ink-2">
                  {active.wa_id}
                </p>
                {ticketIds.length > 0 ? (
                  <p className="t-caption mt-2 text-ink-3">
                    תקלות קשורות:{' '}
                    {ticketIds.map((id, i) => (
                      <span key={id}>
                        {i > 0 ? ', ' : ''}
                        <Link
                          href={`/ops/tickets/${id}`}
                          className="text-[var(--tenant)] hover:underline"
                        >
                          {id.slice(0, 8)}…
                        </Link>
                      </span>
                    ))}
                  </p>
                ) : null}
              </div>

              <div className="flex-1 space-y-2 overflow-y-auto px-4 py-3">
                {messages.length === 0 ? (
                  <EmptyState title="אין הודעות" description="השיחה תופיע כאן" />
                ) : (
                  messages.map((m) => (
                    <div
                      key={m.id}
                      className={`max-w-[85%] rounded-[var(--radius-md)] px-3 py-2 ${
                        m.direction === 'outbound'
                          ? 'ms-auto bg-[var(--tenant-soft)] text-ink'
                          : 'bg-surface-sunken/70 text-ink'
                      }`}
                    >
                      <p className="t-body">{m.body}</p>
                      <time className="t-caption t-num mt-1 block text-ink-3">
                        {new Date(m.created_at).toLocaleString('he-IL')}
                      </time>
                    </div>
                  ))
                )}
              </div>

              <div className="space-y-2 border-t border-border p-4">
                <Button
                  type="button"
                  variant={active.human_takeover ? 'secondary' : 'primary'}
                  size="sm"
                  disabled={busy}
                  onClick={() =>
                    void toggleTakeover(active.wa_id, !active.human_takeover)
                  }
                >
                  {active.human_takeover ? 'החזרה לבוט' : 'השתלטות אנושית'}
                </Button>
                <Field label="תשובה" htmlFor="inbox-reply">
                  <Textarea
                    id="inbox-reply"
                    rows={2}
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    placeholder="כתבו הודעה ללקוח…"
                    disabled={busy}
                  />
                </Field>
                <Button
                  type="button"
                  variant="primary"
                  size="block"
                  disabled={busy || !reply.trim()}
                  onClick={() => void sendReply()}
                >
                  {busy ? 'שולח…' : 'שליחה'}
                </Button>
              </div>
            </>
          )}
        </Panel>
      </div>
    </div>
  )
}
