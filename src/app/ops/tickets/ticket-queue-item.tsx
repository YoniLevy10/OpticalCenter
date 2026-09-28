'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Check, MessageSquareText, Search } from 'lucide-react'
import type { TicketStatus } from '@/modules/tickets/constants'
import {
  OPEN_TICKET_STATUSES,
  TICKET_STATUS_LABELS_HE,
} from '@/modules/tickets/constants'
import { Button } from '@/components/ui/button'
import { BottomSheet } from '@/components/ui/overlay'
import { Textarea } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { OperationalRow, Dot } from '@/components/ui/operational-row'
import { StatusLabel } from '@/components/ui/signal'
import { priorityEdgeClass, priorityRowClass } from '@/components/ui/signal'
import { SwipeActions } from '@/components/ui/swipe-actions'
import { MidragSearchAction } from '@/components/ops/midrag-search-action'
import { cn } from '@/lib/utils'
import {
  plainOpenForHe,
  storeLabel,
} from '@/components/ops/plain-labels'

const HQ_STATUS_OPTIONS: TicketStatus[] = [
  'assigned',
  'in_progress',
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
  const [pending, startTransition] = useTransition()
  const [busy, setBusy] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [midragOpen, setMidragOpen] = useState(false)
  const [status, setStatus] = useState<TicketStatus>(
    (ticket.status as TicketStatus) || 'assigned',
  )
  const [note, setNote] = useState('')

  const open = OPEN_TICKET_STATUSES.includes(ticket.status as TicketStatus)
  const unassigned = !ticket.assigned_to
  const openFor = plainOpenForHe(ticket.created_at, ticket)
  const disabled = busy || pending
  const midragCategory = ticket.category?.trim() || 'other'
  const midragCity = ticket.stores?.city ?? null

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
    const ok = await patch({ status: 'resolved' }, 'התקלה הסתיימה')
    if (ok) startTransition(() => router.refresh())
  }

  if (!open) {
    return (
      <OperationalRow
        href={`/ops/tickets/${ticket.id}`}
        priority={ticket.priority}
        leading={
          <span className="inline-flex items-center gap-2">
            <span className="t-num" data-live="ticket-no">
              {displayNum(ticket)}
              <span className="mx-1.5 text-ink-3" aria-hidden>
                ·
              </span>
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

  const rowLink = (
    <Link
      href={`/ops/tickets/${ticket.id}`}
      className={cn(
        'flex min-h-[80px] min-w-0 flex-1 flex-col justify-center gap-1.5 px-4 py-3.5 ps-5 transition-colors duration-[var(--dur-1)] active:bg-surface-sunken/50 md:hover:bg-surface-sunken/40',
        priorityEdgeClass(ticket.priority),
      )}
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="t-caption t-num text-ink-3" data-live="ticket-no">
          <span className="text-ink">{displayNum(ticket)}</span>
          <span className="mx-1.5" aria-hidden>
            ·
          </span>
          {storeLabel(ticket.stores)}
        </span>
        <span
          className={cn(
            't-meta shrink-0',
            openFor.overdue
              ? 'text-[var(--signal-critical)]'
              : 'text-ink-3',
          )}
        >
          {openFor.text}
        </span>
      </div>
      <span className="t-lead line-clamp-2 text-ink">
        {ticket.title || ticket.description}
      </span>
      <div className="mt-0.5 flex items-center gap-2">
        <StatusLabel status={ticket.status} />
        <Dot />
        <span className="t-meta truncate text-ink-2">{assigneeLabel}</span>
      </div>
    </Link>
  )

  const desktopActions = (
    <div className="hidden shrink-0 items-center gap-2 border-t border-border px-4 py-2.5 md:flex md:w-48 md:flex-col md:justify-center md:border-s md:border-t-0 md:px-3">
      {unassigned ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="min-h-[var(--tap)] w-full"
          onClick={() => setMidragOpen(true)}
        >
          <Search className="h-3.5 w-3.5" aria-hidden />
          מידרג
        </Button>
      ) : null}
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="min-h-[var(--tap)] w-full"
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
        className="min-h-[var(--tap)] w-full"
        disabled={disabled}
        onClick={openUpdateSheet}
      >
        <MessageSquareText className="h-3.5 w-3.5" aria-hidden />
        עדכון
      </Button>
    </div>
  )

  const swipeButtons = (
    <div className="flex h-full w-full">
      {unassigned ? (
        <button
          type="button"
          onClick={() => setMidragOpen(true)}
          className="flex flex-1 flex-col items-center justify-center gap-1 bg-[var(--ink)] text-white t-caption"
        >
          <Search className="h-4 w-4" aria-hidden />
          מידרג
        </button>
      ) : null}
      <button
        type="button"
        disabled={disabled}
        onClick={() => void resolveTicket()}
        className="flex flex-1 flex-col items-center justify-center gap-1 bg-[var(--signal-resolved)] text-white t-caption"
      >
        <Check className="h-4 w-4" aria-hidden />
        סגור
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={openUpdateSheet}
        className="flex flex-1 flex-col items-center justify-center gap-1 bg-[var(--signal-progress)] text-white t-caption"
      >
        <MessageSquareText className="h-4 w-4" aria-hidden />
        עדכון
      </button>
    </div>
  )

  return (
    <div
      className={cn(
        'border-b border-border last:border-b-0 md:flex md:flex-row md:items-stretch',
        priorityRowClass(ticket.priority),
      )}
    >
      <div className="min-w-0 flex-1 md:flex md:min-h-0 md:flex-col">
        <SwipeActions
          actions={swipeButtons}
          disabled={disabled}
          className="md:flex-1"
        >
          {rowLink}
        </SwipeActions>
        {unassigned ? (
          <div className="border-t border-border px-4 py-2 md:hidden">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="min-h-[var(--tap)] w-full"
              onClick={() => setMidragOpen(true)}
            >
              <Search className="h-3.5 w-3.5" aria-hidden />
              חיפוש איש מקצוע במידרג
            </Button>
          </div>
        ) : null}
      </div>
      {desktopActions}

      {unassigned ? (
        <MidragSearchAction
          category={midragCategory}
          city={midragCity}
          hideTrigger
          open={midragOpen}
          onOpenChange={setMidragOpen}
        />
      ) : null}

      <BottomSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title={`עדכון ${displayNum(ticket)}`}
        detent="half"
      >
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="t-caption text-ink-2">סטטוס</span>
            <select
              className="t-control min-h-[var(--tap)] rounded-[var(--radius-md)] border border-border bg-surface px-3 text-ink"
              value={status}
              onChange={(e) => setStatus(e.target.value as TicketStatus)}
              disabled={disabled}
            >
              {HQ_STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {TICKET_STATUS_LABELS_HE[s]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="t-caption text-ink-2">הערה (אופציונלי)</span>
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
    </div>
  )
}
