'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { ArrowRight, CheckCheck, ExternalLink, SendHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/input'
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

type ThreadItem =
  | { kind: 'day'; key: string; label: string }
  | { kind: 'message'; key: string; message: ThreadMessage }

function sessionTitle(s: Session): string {
  return s.display_name || s.store_name || s.store_code || s.wa_id
}

function isDesktopMq(): boolean {
  if (typeof window === 'undefined') return true
  return window.matchMedia('(min-width: 1024px)').matches
}

function initialsFrom(label: string): string {
  const parts = label.trim().split(/\\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0]!.slice(0, 2)
  return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`
}

function formatBubbleTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
}

function dayKey(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

function formatDayLabel(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  if (sameDay(d, today)) return 'היום'
  if (sameDay(d, yesterday)) return 'אתמול'
  return d.toLocaleDateString('he-IL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function buildThreadItems(messages: ThreadMessage[]): ThreadItem[] {
  const items: ThreadItem[] = []
  let lastDay: string | null = null
  for (const message of messages) {
    const key = dayKey(message.created_at)
    if (key !== lastDay) {
      items.push({
        kind: 'day',
        key: `day-${key}`,
        label: formatDayLabel(message.created_at),
      })
      lastDay = key
    }
    items.push({ kind: 'message', key: message.id, message })
  }
  return items
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

  const threadEndRef = useRef<HTMLDivElement | null>(null)
  const composerRef = useRef<HTMLTextAreaElement | null>(null)

  const loadSessions = useCallback(async () => {
    setError(null)
    try {
      const res = await fetch('/api/inbox/sessions')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'טעינה נכשלה')
      setSessions(json.sessions ?? [])
      if (!selected && json.sessions?.[0] && isDesktopMq()) {
        setSelected(json.sessions[0].wa_id as string)
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

  useLayoutEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, selected])

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
      setNotice(
        status === 'waiting'
          ? 'סומן כממתין — השתלטות אנושית'
          : 'סומן כטופל',
      )
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
      // Israel-only pilot: do not send countryId (server defaults to IL).
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
      composerRef.current?.focus()
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
        display_number: null as string | null,
        title: null as string | null,
        status: 'new',
        priority: active?.priority ?? 'medium',
        description: '',
        store_code: active?.store_code ?? null,
        store_name: active?.store_name ?? null,
      }))

  const waiting =
    Boolean(active?.human_takeover) || active?.inbox_status === 'waiting'

  const threadItems = useMemo(() => buildThreadItems(messages), [messages])

  const listPanel = (
    <Panel flush elevated className="flex min-h-0 flex-col overflow-hidden">
      <PanelHeader title="שיחות" meta={`${sessions.length}`} />
      {sessions.length === 0 ? (
        <EmptyState title="אין שיחות פעילות" />
      ) : (
        <ul className="divide-y divide-border overflow-y-auto">
          {sessions.map((s) => {
            const selectedRow = selected === s.wa_id
            const title = sessionTitle(s)
            return (
              <li key={s.wa_id}>
                <button
                  type="button"
                  onClick={() => openConversation(s.wa_id)}
                  className={cn(
                    'flex w-full items-center gap-3 px-3 py-3 text-start transition-colors hover:bg-canvas',
                    priorityEdgeClass(s.priority),
                    priorityRowClass(s.priority),
                    selectedRow && 'bg-[var(--tenant-soft)]',
                  )}
                >
                  <span
                    aria-hidden
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--tenant)_22%,white)] text-sm font-semibold text-[var(--tenant)]"
                  >
                    {initialsFrom(title)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="t-body-strong flex min-w-0 items-center gap-2 text-ink">
                        {s.unread ? (
                          <span
                            aria-label="לא נקרא"
                            className="h-2 w-2 shrink-0 rounded-full bg-[var(--tenant)]"
                          />
                        ) : null}
                        <span className="truncate">{title}</span>
                      </span>
                      <LiveAge createdAt={s.updated_at} className="shrink-0" />
                    </span>
                    <p className="t-body mt-0.5 line-clamp-1 text-ink-2">
                      {s.last_message || s.last_inbound || 'אין הודעות'}
                    </p>
                    <span className="mt-1 flex flex-wrap items-center gap-2">
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
                    </span>
                  </span>
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
    <Panel
      flush
      elevated
      className="flex min-h-[min(72vh,640px)] flex-col overflow-hidden lg:min-h-0"
    >
      {!active ? (
        <div className="flex flex-1 items-center justify-center wa-empty-stage">
          <EmptyState
            title="בחרו שיחה"
            description="מהרשימה מימין — התצוגה תיראה כמו WhatsApp"
          />
        </div>
      ) : (
        <>
          <header className="flex items-center gap-3 bg-[var(--tenant)] px-3 py-2.5 text-[var(--tenant-contrast)] shadow-[var(--shadow-1)]">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="-ms-1 shrink-0 text-[var(--tenant-contrast)] hover:bg-white/10 hover:text-[var(--tenant-contrast)] lg:hidden"
              onClick={backToList}
              aria-label="חזרה לרשימה"
            >
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Button>
            <span
              aria-hidden
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20 text-sm font-semibold"
            >
              {initialsFrom(sessionTitle(active))}
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-[15px] font-semibold leading-tight">
                {sessionTitle(active)}
              </h2>
              <p dir="ltr" className="truncate text-[12px] opacity-85">
                {context?.wa_display || active.wa_id}
              </p>
            </div>
            <div className="flex shrink-0 gap-1.5">
              <Button
                type="button"
                size="sm"
                disabled={busy}
                variant={waiting ? 'secondary' : 'ghost'}
                className={cn(
                  'h-8 border-0 px-2.5 text-[12px]',
                  waiting
                    ? 'bg-white text-[var(--tenant)] hover:bg-white/90'
                    : 'text-[var(--tenant-contrast)] hover:bg-white/15 hover:text-[var(--tenant-contrast)]',
                )}
                onClick={() => void setInboxStatus(active.wa_id, 'waiting')}
              >
                ממתין
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={busy}
                variant={!waiting ? 'resolve' : 'ghost'}
                className={cn(
                  'h-8 border-0 px-2.5 text-[12px]',
                  !waiting
                    ? undefined
                    : 'text-[var(--tenant-contrast)] hover:bg-white/15 hover:text-[var(--tenant-contrast)]',
                )}
                onClick={() => void setInboxStatus(active.wa_id, 'handled')}
              >
                טופל
              </Button>
            </div>
          </header>

          {linkedTickets.length > 0 ? (
            <div className="wa-ticket-strip border-b px-3 py-1.5">
              <p className="t-caption">
                מקושר לתקלה:{' '}
                {linkedTickets.map((t, i) => (
                  <span key={t.id}>
                    {i > 0 ? ', ' : ''}
                    <Link
                      href={`/ops/tickets/${t.id}`}
                      className="font-medium text-[var(--tenant)] hover:underline"
                    >
                      {t.display_number || `${t.id.slice(0, 8)}…`}
                    </Link>
                  </span>
                ))}
              </p>
            </div>
          ) : null}

          <div className="wa-chat-wallpaper relative flex-1 overflow-y-auto px-2.5 py-3 sm:px-4">
            {messages.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <EmptyState title="אין הודעות" description="השיחה תופיע כאן" />
              </div>
            ) : (
              <div className="mx-auto flex w-full max-w-3xl flex-col gap-1.5">
                {threadItems.map((item) =>
                  item.kind === 'day' ? (
                    <div key={item.key} className="my-2 flex justify-center">
                      <span className="wa-day-pill rounded-full px-3 py-1 text-[11px] font-medium shadow-sm">
                        {item.label}
                      </span>
                    </div>
                  ) : (
                    <div
                      key={item.key}
                      className={cn(
                        'flex',
                        // RTL WhatsApp: outbound (us) on the left, inbound on the right.
                        item.message.direction === 'outbound'
                          ? 'justify-end'
                          : 'justify-start',
                      )}
                    >
                      <div
                        className={cn(
                          'wa-bubble relative max-w-[min(85%,28rem)] px-2.5 pb-1.5 pt-1.5 text-[14.5px] leading-snug shadow-sm',
                          item.message.direction === 'outbound'
                            ? 'wa-bubble-out rounded-2xl rounded-ee-md'
                            : 'wa-bubble-in rounded-2xl rounded-es-md',
                        )}
                      >
                        <p className="whitespace-pre-wrap break-words pe-12">
                          {item.message.body}
                        </p>
                        <div className="mt-0.5 flex items-center justify-end gap-1">
                          {item.message.ticket_id ? (
                            <Link
                              href={`/ops/tickets/${item.message.ticket_id}`}
                              className="me-auto text-[10px] text-[var(--tenant)] hover:underline"
                            >
                              תקלה {item.message.ticket_id.slice(0, 8)}…
                            </Link>
                          ) : null}
                          <time className="wa-bubble-meta text-[10px] tabular-nums">
                            {formatBubbleTime(item.message.created_at)}
                          </time>
                          {item.message.direction === 'outbound' ? (
                            <CheckCheck
                              className="h-3.5 w-3.5 text-[#53bdeb]"
                              aria-label="נשלח"
                            />
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ),
                )}
                <div ref={threadEndRef} />
              </div>
            )}
          </div>

          <div className="wa-composer-bar flex items-end gap-2 px-2 py-2 sm:px-3">
            <label className="sr-only" htmlFor="inbox-reply">
              הודעה ללקוח
            </label>
            <Textarea
              ref={composerRef}
              id="inbox-reply"
              rows={1}
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  void sendReply()
                }
              }}
              placeholder="כתבו הודעה ללקוח…"
              disabled={busy}
              className="wa-composer-input max-h-32 min-h-[42px] flex-1 resize-none rounded-[22px] border-0 px-4 py-2.5 shadow-sm focus:ring-1 focus:ring-[color-mix(in_srgb,var(--tenant)_35%,transparent)]"
            />
            <button
              type="button"
              disabled={busy || !reply.trim()}
              onClick={() => void sendReply()}
              aria-label={busy ? 'שולח' : 'שליחה'}
              className={cn(
                'mb-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-opacity',
                'bg-[var(--tenant)] text-[var(--tenant-contrast)] shadow-[var(--shadow-1)]',
                'hover:bg-[var(--tenant-hover)] disabled:opacity-40',
              )}
            >
              <SendHorizontal className="h-5 w-5 -scale-x-100" aria-hidden />
            </button>
          </div>
        </>
      )}
    </Panel>
  )

  return (
    <div className="flex flex-col gap-3">
      {error ? <ErrorState title="שגיאה" description={error} /> : null}
      {notice ? <Notice tone="progress">{notice}</Notice> : null}

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

      <div className="hidden min-h-[640px] gap-4 lg:grid lg:grid-cols-[300px_minmax(0,1fr)_240px]">
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
