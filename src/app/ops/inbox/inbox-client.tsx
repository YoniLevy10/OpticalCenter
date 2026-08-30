'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { ArrowRight, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field, Textarea } from '@/components/ui/input'
import {
  EmptyState,
  ErrorState,
  Notice,
  Panel,
  PanelHeader,
} from '@/components/ui/primitives'
import {
  PriorityText,
  StatusLabel,
  priorityEdgeClass,
  priorityRowClass,
} from '@/components/ui/signal'
import { LiveAge } from '@/components/ui/time'
import { cn } from '@/lib/utils'
import { TICKET_PRIORITY_LABELS_HE } from '@/modules/tickets/constants'

type Session = {
  wa_id: string
  store_code: string | null
  store_name?: string | null
  customer_name?: string | null
  display_name?: string
  state: string
  human_takeover?: boolean
  last_inbound?: string | null
  last_message?: string | null
  unread?: boolean
  priority?: string | null
  inbox_status?: 'waiting' | 'handled'
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

type OpenTicket = {
  id: string
  display_number: string | null
  title: string | null
  status: string
  priority: string
  description: string
  store_code: string | null
  store_name: string | null
}

type SessionContext = {
  store_name: string | null
  store_code: string | null
  customer_name: string | null
  wa_display: string
  openTickets: OpenTicket[]
}

function sessionTitle(s: Session): string {
  return s.display_name || s.store_name || s.store_code || s.wa_id
}

function isDesktopMq(): boolean {
  if (typeof window === 'undefined') return true
  return window.matchMedia('(min-width: 1024px)').matches
}

export function InboxClient() {
  const searchParams = useSearchParams()
  const waFromUrl = searchParams.get('wa')

  const [sessions, setSessions] = useState<Session[]>([])
  const [messages, setMessages] = useState<ThreadMessage[]>([])
  const [ticketIds, setTicketIds] = useState<string[]>([])
  const [openTickets, setOpenTickets] = useState<OpenTicket[]>([])
  const [context, setContext] = useState<SessionContext | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [selected, setSelected] = useState<string | null>(waFromUrl)
  const [mobileShowThread, setMobileShowThread] = useState(Boolean(waFromUrl))
  const [reply, setReply] = useState('')

  const loadSessions = useCallback(async () => {
    setError(null)
    try {
      const res = await fetch('/api/inbox/sessions')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'טעינה נכשלה')
      setSessions(json.sessions ?? [])
      // Desktop: auto-select first if nothing selected; mobile stays on list.
      if (!selected && json.sessions?.[0] && isDesktopMq()) {
        setSelected(json.sessions[0].wa_id)
      }
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
      setOpenTickets(json.openTickets ?? json.context?.openTickets ?? [])
      setContext(json.context ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'טעינת שיחה נכשלה')
    }
  }, [])

  useEffect(() => {
    void loadSessions()
  }, [loadSessions])

  useEffect(() => {
    if (waFromUrl) {
      setSelected(waFromUrl)
      setMobileShowThread(true)
    }
  }, [waFromUrl])

  useEffect(() => {
    if (selected) void loadThread(selected)
  }, [selected, loadThread])

  function openConversation(waId: string) {
    setSelected(waId)
    setMobileShowThread(true)
    setNotice(null)
  }

  function backToList() {
    setMobileShowThread(false)
    setNotice(null)
  }

  async function setInboxStatus(waId: string, status: 'handled' | 'waiting') {
    setBusy(true)
    setNotice(null)
    try {
      const res = await fetch('/api/inbox/sessions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wa_id: waId, status }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'עדכון נכשל')
      setNotice(status === 'waiting' ? 'סומן כממתין — השתלטות אנושית' : 'סומן כטופל')
      await loadSessions()
      if (selected) await loadThread(selected)
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
      const rawCountry = active?.country_id
      const countryId =
        rawCountry &&
        rawCountry !== 'null' &&
        rawCountry !== 'undefined' &&
        /^[0-9a-f-]{36}$/i.test(rawCountry)
          ? rawCountry
          : undefined
      const rawTicket = ticketIds[0] ?? openTickets[0]?.id ?? null
      const ticketId =
        rawTicket &&
        rawTicket !== 'null' &&
        /^[0-9a-f-]{36}$/i.test(rawTicket)
          ? rawTicket
          : null

      const res = await fetch(
        `/api/inbox/sessions/${encodeURIComponent(selected)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: reply.trim(),
            ticketId,
            ...(countryId ? { countryId } : {}),
          }),
        },
      )
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'שליחה נכשלה')
      if (json.send && json.send.ok === false) {
        throw new Error(json.send.error || 'שליחת WhatsApp נכשלה')
      }
      if (json.send?.dryRun) {
        throw new Error(
          'ההודעה לא נשלחה ללקוח (מצב הדמיה / חסרים פרטי Meta). בדקו WHATSAPP_ACCESS_TOKEN ו־WHATSAPP_PHONE_NUMBER_ID.',
        )
      }
      setReply('')
      setNotice('הודעה נשלחה')
      await loadThread(selected)
      await loadSessions()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שליחה נכשלה')
    } finally {
      setBusy(false)
    }
  }

  const active = sessions.find((s) => s.wa_id === selected) ?? null
  const linkedTickets = openTickets.length
    ? openTickets
    : ticketIds.map((id) => ({
        id,
        display_number: null,
        title: null,
        status: 'new',
        priority: active?.priority ?? 'medium',
        description: '',
        store_code: active?.store_code ?? null,
        store_name: active?.store_name ?? null,
      }))

  const listPanel = (
    <Panel flush elevated className="flex min-h-0 flex-col overflow-hidden">
      <PanelHeader title="שיחות" meta={`${sessions.length}`} />
      {sessions.length === 0 ? (
        <EmptyState title="אין שיחות פעילות" />
      ) : (
        <ul className="divide-y divide-border overflow-y-auto">
          {sessions.map((s) => {
            const selectedRow = selected === s.wa_id
            return (
              <li key={s.wa_id}>
                <button
                  type="button"
                  onClick={() => openConversation(s.wa_id)}
                  className={cn(
                    'flex w-full flex-col gap-1 px-4 py-3 ps-5 text-start transition-colors hover:bg-canvas',
                    priorityEdgeClass(s.priority),
                    priorityRowClass(s.priority),
                    selectedRow && 'bg-[var(--tenant-soft)]',
                  )}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="t-body-strong flex min-w-0 items-center gap-2 text-ink">
                      {s.unread ? (
                        <span
                          aria-label="לא נקרא"
                          className="h-2 w-2 shrink-0 rounded-full bg-[var(--tenant)]"
                        />
                      ) : (
                        <span className="h-2 w-2 shrink-0" aria-hidden />
                      )}
                      <span className="truncate">{sessionTitle(s)}</span>
                    </span>
                    <LiveAge
                      createdAt={s.updated_at}
                      className="shrink-0"
                    />
                  </div>
                  <p className="t-body line-clamp-1 text-ink-2">
                    {s.last_message || s.last_inbound || 'אין הודעות'}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    {s.priority ? (
                      <span className="t-caption text-ink-3">
                        {TICKET_PRIORITY_LABELS_HE[
                          s.priority as keyof typeof TICKET_PRIORITY_LABELS_HE
                        ] ?? s.priority}
                      </span>
                    ) : null}
                    <span className="t-caption text-ink-3">
                      {s.human_takeover || s.inbox_status === 'waiting'
                        ? 'ממתין'
                        : s.state === 'done'
                          ? 'טופל'
                          : s.state}
                    </span>
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </Panel>
  )

  const contextPanel = active ? (
    <Panel flush elevated className="flex min-h-0 flex-col overflow-hidden">
      <PanelHeader title="הקשר" />
      <div className="space-y-4 overflow-y-auto p-4">
        <div>
          <p className="t-caption text-ink-3">לקוח / סניף</p>
          <p className="t-body-strong mt-1 text-ink">
            {context?.customer_name ||
              active.customer_name ||
              'ללא שם לקוח'}
          </p>
          <p className="t-body mt-0.5 text-ink-2">
            {context?.store_name ||
              active.store_name ||
              (active.store_code ? `סניף #${active.store_code}` : 'ללא סניף')}
            {(context?.store_code || active.store_code) &&
            (context?.store_name || active.store_name)
              ? ` · #${context?.store_code || active.store_code}`
              : null}
          </p>
          <p dir="ltr" className="t-caption t-num mt-1 text-ink-3">
            {context?.wa_display || active.wa_id}
          </p>
        </div>

        <div>
          <p className="t-caption mb-2 text-ink-3">תקלות פתוחות</p>
          {linkedTickets.length === 0 ? (
            <p className="t-body text-ink-3">אין תקלות מקושרות</p>
          ) : (
            <ul className="space-y-2">
              {linkedTickets.map((t) => (
                <li key={t.id}>
                  <Link
                    href={`/ops/tickets/${t.id}`}
                    className={cn(
                      'block rounded-[var(--radius-md)] border border-border px-3 py-2 transition-colors hover:bg-canvas',
                      priorityEdgeClass(t.priority),
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="t-body-strong t-num text-ink">
                        {t.display_number || `${t.id.slice(0, 8)}…`}
                      </span>
                      <ExternalLink
                        className="h-3.5 w-3.5 shrink-0 text-ink-3"
                        aria-hidden
                      />
                    </div>
                    <p className="t-body mt-0.5 line-clamp-2 text-ink-2">
                      {t.title || t.description || 'תקלה מקושרת'}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <PriorityText priority={t.priority} className="t-caption" />
                      <StatusLabel status={t.status} className="t-caption" />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Panel>
  ) : null

  const conversationPanel = (
    <Panel elevated className="flex min-h-[420px] flex-col lg:min-h-0">
      {!active ? (
        <EmptyState title="בחרו שיחה" description="מהרשימה מימין" />
      ) : (
        <>
          <div className="border-b border-border px-4 py-3">
            <div className="flex items-start gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="lg:hidden -ms-2 shrink-0"
                onClick={backToList}
                aria-label="חזרה לרשימה"
              >
                <ArrowRight className="h-4 w-4" aria-hidden />
                חזרה
              </Button>
              <div className="min-w-0 flex-1">
                <h2 className="t-section truncate text-ink">
                  {sessionTitle(active)}
                </h2>
                <p dir="ltr" className="t-caption t-num mt-0.5 text-ink-2">
                  {context?.wa_display || active.wa_id}
                </p>
              </div>
            </div>

            {linkedTickets.length > 0 ? (
              <p className="t-caption mt-2 text-ink-3">
                מקושר לתקלה:{' '}
                {linkedTickets.map((t, i) => (
                  <span key={t.id}>
                    {i > 0 ? ', ' : ''}
                    <Link
                      href={`/ops/tickets/${t.id}`}
                      className="text-[var(--tenant)] hover:underline"
                    >
                      {t.display_number || `${t.id.slice(0, 8)}…`}
                    </Link>
                  </span>
                ))}
              </p>
            ) : null}

            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                type="button"
                variant={
                  active.human_takeover || active.inbox_status === 'waiting'
                    ? 'primary'
                    : 'secondary'
                }
                size="sm"
                disabled={busy}
                onClick={() => void setInboxStatus(active.wa_id, 'waiting')}
              >
                ממתין
              </Button>
              <Button
                type="button"
                variant={
                  !active.human_takeover && active.inbox_status !== 'waiting'
                    ? 'resolve'
                    : 'secondary'
                }
                size="sm"
                disabled={busy}
                onClick={() => void setInboxStatus(active.wa_id, 'handled')}
              >
                טופל
              </Button>
            </div>
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto px-4 py-3">
            {messages.length === 0 ? (
              <EmptyState title="אין הודעות" description="השיחה תופיע כאן" />
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={cn(
                    'max-w-[85%] rounded-[var(--radius-md)] px-3 py-2',
                    m.direction === 'outbound'
                      ? 'ms-auto bg-[var(--tenant-soft)] text-ink'
                      : 'bg-surface-sunken/70 text-ink',
                  )}
                >
                  <p className="t-body whitespace-pre-wrap">{m.body}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <time className="t-caption t-num text-ink-3">
                      {new Date(m.created_at).toLocaleString('he-IL')}
                    </time>
                    {m.ticket_id ? (
                      <Link
                        href={`/ops/tickets/${m.ticket_id}`}
                        className="t-caption text-[var(--tenant)] hover:underline"
                      >
                        תקלה {m.ticket_id.slice(0, 8)}…
                      </Link>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="space-y-2 border-t border-border p-4">
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
  )

  return (
    <div className="flex flex-col gap-3">
      {error ? <ErrorState title="שגיאה" description={error} /> : null}
      {notice ? <Notice tone="progress">{notice}</Notice> : null}

      {/* Mobile: list first, then conversation */}
      <div className="lg:hidden">
        {!mobileShowThread ? (
          listPanel
        ) : (
          <div className="flex flex-col gap-3">
            {conversationPanel}
            {contextPanel}
          </div>
        )}
      </div>

      {/* Desktop: list + conversation + context */}
      <div className="hidden min-h-[560px] gap-4 lg:grid lg:grid-cols-[280px_minmax(0,1fr)_240px]">
        {listPanel}
        {conversationPanel}
        {contextPanel ?? (
          <Panel elevated className="flex items-center justify-center">
            <EmptyState title="הקשר" description="בחרו שיחה להצגת פרטים" />
          </Panel>
        )}
      </div>
    </div>
  )
}
