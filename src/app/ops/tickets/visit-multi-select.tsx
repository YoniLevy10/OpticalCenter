'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Truck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BottomSheet } from '@/components/ui/overlay'
import { useToast } from '@/components/ui/toast'
import {
  VisitSelectionProvider,
  useVisitSelection,
  type VisitSelectableTicket,
} from './visit-selection-context'

type VendorOption = { id: string; name: string }

function VisitBarInner({
  vendors,
  storeFilter,
}: {
  vendors: VendorOption[]
  storeFilter?: string
}) {
  const router = useRouter()
  const toast = useToast()
  const selection = useVisitSelection()
  const [, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const [vendorId, setVendorId] = useState(vendors[0]?.id ?? '')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)

  const selectedTickets = useMemo(() => {
    if (!selection) return [] as VisitSelectableTicket[]
    return [...selection.selected]
      .map((id) => selection.ticketsById.get(id))
      .filter((t): t is VisitSelectableTicket => Boolean(t))
  }, [selection])

  const storeIds = useMemo(
    () => [...new Set(selectedTickets.map((t) => t.storeId).filter(Boolean))],
    [selectedTickets],
  )
  const storeCodes = useMemo(
    () => [...new Set(selectedTickets.map((t) => t.storeCode).filter(Boolean))],
    [selectedTickets],
  )

  const canOpen =
    selectedTickets.length > 0 &&
    storeIds.length === 1 &&
    Boolean(storeFilter || storeCodes.length === 1)

  if (!selection) return null
  if (selectedTickets.length === 0) {
    return (
      <p className="t-caption text-ink-3">
        {storeFilter
          ? 'סמנו תקלות לשיגור ביקור משולב לחנות זו'
          : 'סננו לפי חנות ואז סמנו תקלות לשיגור ביקור משולב'}
      </p>
    )
  }

  async function dispatchVisit() {
    if (!canOpen || storeIds.length !== 1) {
      toast.push({
        title: 'יש לבחור תקלות מחנות אחת בלבד',
        tone: 'critical',
      })
      return
    }
    if (!vendorId) {
      toast.push({ title: 'בחרו ספק', tone: 'critical' })
      return
    }
    setBusy(true)
    try {
      const res = await fetch('/api/ops/visits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          storeId: storeIds[0],
          ticketIds: selectedTickets.map((t) => t.id),
          vendorId,
          notes: notes.trim() || undefined,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.push({
          title:
            typeof data.error === 'string' ? data.error : 'שיגור הביקור נכשל',
          tone: 'critical',
        })
        return
      }
      toast.push({
        title: `ביקור שובץ · ${selectedTickets.length} תקלות`,
        tone: 'success',
      })
      selection?.clear()
      setOpen(false)
      setNotes('')
      startTransition(() => router.refresh())
    } catch {
      toast.push({ title: 'שגיאת רשת', tone: 'critical' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 rounded-[var(--radius-md)] border border-border bg-surface-sunken/40 px-3 py-2">
        <p className="t-body flex-1 text-ink">
          נבחרו {selectedTickets.length}
          {storeCodes[0] ? ` · חנות #${storeCodes[0]}` : ''}
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => selection.clear()}
        >
          נקה
        </Button>
        <Button
          type="button"
          variant="primary"
          size="sm"
          disabled={!canOpen || vendors.length === 0}
          onClick={() => setOpen(true)}
        >
          <Truck className="h-3.5 w-3.5" aria-hidden />
          שיגור ביקור
        </Button>
      </div>

      <BottomSheet
        open={open}
        onOpenChange={setOpen}
        title="שיגור ביקור משולב"
        description={
          storeCodes[0]
            ? `חנות #${storeCodes[0]} · ${selectedTickets.length} תקלות`
            : undefined
        }
      >
        <div className="flex flex-col gap-4">
          {!canOpen ? (
            <p className="t-body text-[var(--signal-critical)]">
              יש לסנן לפי חנות ולבחור תקלות מאותה חנות בלבד
            </p>
          ) : null}
          <label className="flex flex-col gap-1.5">
            <span className="t-caption text-ink-2">ספק / בעל מקצוע</span>
            <select
              className="t-control min-h-[var(--tap)] rounded-[var(--radius-md)] border border-border bg-surface px-3 text-ink"
              value={vendorId}
              onChange={(e) => setVendorId(e.target.value)}
              disabled={busy}
            >
              {vendors.length === 0 ? (
                <option value="">אין ספקים פעילים</option>
              ) : (
                vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))
              )}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="t-caption text-ink-2">הערה (אופציונלי)</span>
            <textarea
              className="t-control min-h-[5rem] rounded-[var(--radius-md)] border border-border bg-surface px-3 py-2 text-ink"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={busy}
              placeholder="תיאום ביקור, שעת הגעה…"
            />
          </label>
          <ul className="t-caption max-h-32 space-y-1 overflow-y-auto text-ink-2">
            {selectedTickets.map((t) => (
              <li key={t.id}>{t.label}</li>
            ))}
          </ul>
          <Button
            type="button"
            variant="primary"
            size="touch"
            className="w-full"
            disabled={busy || !canOpen || !vendorId}
            onClick={() => void dispatchVisit()}
          >
            אישור שיגור
          </Button>
        </div>
      </BottomSheet>
    </>
  )
}

export function VisitMultiSelectBar({
  tickets,
  vendors,
  storeFilter,
}: {
  tickets: VisitSelectableTicket[]
  vendors: VendorOption[]
  storeFilter?: string
}) {
  return (
    <VisitSelectionProvider tickets={tickets}>
      <VisitBarInner vendors={vendors} storeFilter={storeFilter} />
      {/* Selection checkboxes live on TicketQueueItem via the same provider —
          page must wrap both bar and list. This export is the bar-only tree;
          page uses VisitQueueShell for shared provider. */}
    </VisitSelectionProvider>
  )
}

/** Shared shell so the bar and queue rows share one selection set. */
export function VisitQueueShell({
  tickets,
  vendors,
  storeFilter,
  children,
}: {
  tickets: VisitSelectableTicket[]
  vendors: VendorOption[]
  storeFilter?: string
  children: React.ReactNode
}) {
  return (
    <VisitSelectionProvider tickets={tickets}>
      <div className="flex flex-col gap-3">
        <VisitBarInner vendors={vendors} storeFilter={storeFilter} />
        {children}
      </div>
    </VisitSelectionProvider>
  )
}
