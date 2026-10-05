'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Check, MessageSquareText } from 'lucide-react'
import type { TicketStatus } from '@/modules/tickets/constants'
import {
  OPEN_TICKET_STATUSES,
  TICKET_STATUS_LABELS_HE,
} from '@/modules/tickets/constants'
import { Button } from '@/components/ui/button'
import { BottomSheet } from '@/components/ui/overlay'
import { Textarea } from '@/components/ui/input'
import { useLocale, usePhrase } from '@/components/i18n/locale-provider'
import { useToast } from '@/components/ui/toast'
import { OperationalRow, Dot } from '@/components/ui/operational-row'
import { StatusLabel } from '@/components/ui/signal'
import { cn } from '@/lib/utils'
import {
  plainOpenForHe,
  storeLabel,
} from '@/components/ops/plain-labels'

const HQ_STATUS_OPTIONS: TicketStatus[] = [
  'assigned',
  'awaiting_info',
  'in_progress',
  'waiting_vendor',
  'waiting_parts',
  'resolved',
]

type RowTicket = {
  id: string
  number?: number | null
  display_number?: string | null
  status: string
  priority: string
  category?: string | null
  description: string
  title?: string | null
  assigned_to?: string | null
  created_at: string
  stores?: {
    code?: string
    name?: string
    city?: string | null
  } | null
}

function displayNum(t: RowTicket): string {
  if (t.display_number?.trim()) return t.display_number
  if (t.number != null) return `OC-${t.number}`
  return t.id.slice(0, 8)
}

export function TicketQueueItem({
  ticket,
  assigneeLabel,
}: {
  ticket: RowTicket
  view: 'open' | 'resolved'
  assigneeLabel: string
}) {
  const router = useRouter()
  const toast = useToast()
  const { locale } = useLocale()
  const p = usePhrase()
  const [pending, startTransition] = useTransition()
  const [busy, setBusy] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [status, setStatus] = useState<TicketStatus>(
    (ticket.status as TicketStatus) || 'assigned',
  )
  const [note, setNote] = useState('')

  const open = OPEN_TICKET_STATUSES.includes(ticket.status as TicketStatus)
  const openFor = plainOpenForHe(ticket.created_at, ticket, new Date(), locale)
  const disabled = busy || pending
  const critical =
    ticket.priority === 'critical' || ticket.priority === 'high' || openFor.overdue

  async function patch(body: Record<string, unknown>, successText: string) {
    if (busy || pending) return false
    setBusy(true)
    try {
      const res = await fetch(`/api/tickets/${ticket.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.push({
          title:
            typeof data.error === 'string' ? data.error : 'העדכון נכשל',
          tone: 'critical',
        })
        return false
      }
      toast.push({ title: successText, tone: 'success' })
      startTransition(() => router.refresh())
      return true
    } catch {
      toast.push({ title: 'שגיאת רשת', tone: 'critical' })
      return false
    } finally {
      setBusy(false)
    }
  }

  function openUpdateSheet() {
    setStatus(
      HQ_STATUS_OPTIONS.includes(ticket.status as TicketStatus)
        ? (ticket.status as TicketStatus)
        : 'in_progress',
    )
    setNote('')
    setSheetOpen(true)
  }

  async function resolveTicket() {
    await patch({ status: 'resolved' }, 'התקלה הסתיימה')
  }

  if (!open) {
    return (
      <OperationalRow
        href={`/ops/tickets/${ticket.id}`}
        priority={ticket.priority}
        leading={
          <span className="inline-flex items-center gap-2">
            <span className="t-num text-ink">{displayNum(ticket)}</span>
            <span aria-hidden className="text-ink-3">
              ·
            </span>
            <span>{storeLabel(ticket.stores)}</span>
          </span>
        }
        title={ticket.title || ticket.description}
        footer={
          <>
            <StatusLabel status={ticket.status} />
            <Dot />
            <span className="t-meta truncate text-ink-2">{assigneeLabel}</span>
          </>
        }
      />
    )
  }

  return (
    <article
      className={cn(
        'border-b border-border bg-surface last:border-b-0',
        'transition-colors duration-[var(--dur-1)] hover:bg-surface-sunken/40',
      )}
    >
      <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:gap-4">
        <Link
          href={`/ops/tickets/${ticket.id}`}
          className="min-w-0 flex-1 space-y-1.5"
        >
          <div className="flex items-baseline justify-between gap-3">
            <p className="t-caption t-num text-ink-3">
              <span className="font-semibold text-ink">{displayNum(ticket)}</span>
              <span className="mx-1.5" aria-hidden>
                ·
              </span>
              {storeLabel(ticket.stores)}
            </p>
            <span
              className={cn(
                't-meta shrink-0',
                openFor.overdue
                  ? 'font-semibold text-[var(--signal-critical)]'
                  : 'text-ink-3',
              )}
            >
              {openFor.overdue ? `${p('חורגת')} · ` : null}
              {openFor.text}
            </span>
          </div>
          <p className="t-lead line-clamp-2 text-ink">
            {ticket.title || ticket.description}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <StatusLabel status={ticket.status} />
            {critical ? (
              <span className="t-caption rounded-full bg-[var(--signal-critical-soft)] px-2 py-0.5 font-semibold text-[var(--signal-critical)]">
                {p('דחוף')}
              </span>
            ) : null}
            <Dot />
            <span className="t-meta truncate text-ink-2">{assigneeLabel}</span>
          </div>
        </Link>

        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:flex-col sm:items-stretch sm:w-[7.5rem]">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="min-h-[40px] flex-1 sm:w-full"
            disabled={disabled}
            onClick={() => void resolveTicket()}
          >
            <Check className="h-3.5 w-3.5" aria-hidden />
            סגור
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="min-h-[40px] flex-1 sm:w-full"
            disabled={disabled}
            onClick={openUpdateSheet}
          >
            <MessageSquareText className="h-3.5 w-3.5" aria-hidden />
            עדכון
          </Button>
        </div>
      </div>

      <BottomSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title={`${p('עדכון')} ${displayNum(ticket)}`}
        detent="half"
      >
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="t-caption text-ink-2">{p('סטטוס')}</span>
            <select
              className="t-control min-h-[var(--tap)] rounded-[var(--radius-md)] border border-border bg-surface px-3 text-ink"
              value={status}
              onChange={(e) => setStatus(e.target.value as TicketStatus)}
              disabled={disabled}
            >
              {HQ_STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {p(TICKET_STATUS_LABELS_HE[s])}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="t-caption text-ink-2">{p('הערה (אופציונלי)')}</span>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="מה עודכן / למה נסגר…"
              rows={3}
              disabled={disabled}
            />
          </label>
          <Button
            type="button"
            variant="primary"
            size="touch"
            className="w-full"
            disabled={disabled}
            onClick={() =>
              void (async () => {
                const body: Record<string, unknown> = { status }
                const trimmed = note.trim()
                if (trimmed) body.note = trimmed
                const ok = await patch(body, 'התקלה עודכנה')
                if (ok) setSheetOpen(false)
              })()
            }
          >
            שמור עדכון
          </Button>
        </div>
      </BottomSheet>
    </article>
  )
}
