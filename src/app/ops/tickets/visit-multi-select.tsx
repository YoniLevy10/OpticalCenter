'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Truck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import {
  VisitConfirmSheet,
  buildVisitIdempotencyKey,
  scheduledAtToIso,
  useSubmitGuard,
  type VisitResult,
} from './visit-confirm-sheet'
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
  const [scheduledAt, setScheduledAt] = useState('')
  const [result, setResult] = useState<VisitResult | null>(null)
  const [idempotencyKey, setIdempotencyKey] = useState<string | null>(null)
  const { busy, run } = useSubmitGuard()

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

  function openSheet() {
    if (!canOpen || storeIds.length !== 1) return
    setResult(null)
    setIdempotencyKey(
      buildVisitIdempotencyKey({
        storeId: storeIds[0]!,
        vendorId: vendorId || vendors[0]?.id || '',
        ticketIds: selectedTickets.map((t) => t.id),
      }),
    )
    setOpen(true)
  }

  async function postVisit(opts?: {
    retryFailedOnly?: boolean
    retryTicketIds?: string[]
  }) {
    if (!canOpen || storeIds.length !== 1 || !vendorId) {
      toast.push({
        title: 'יש לבחור תקלות מחנות אחת וספק',
        tone: 'critical',
      })
      return
    }
    const key =
      idempotencyKey ??
      buildVisitIdempotencyKey({
        storeId: storeIds[0]!,
        vendorId,
        ticketIds: selectedTickets.map((t) => t.id),
      })
    setIdempotencyKey(key)

    await run(async () => {
      const res = await fetch('/api/ops/visits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          storeId: storeIds[0],
          ticketIds: selectedTickets.map((t) => t.id),
          vendorId,
          notes: notes.trim() || undefined,
          scheduledAt: scheduledAtToIso(scheduledAt),
          idempotencyKey: key,
          retryFailedOnly: opts?.retryFailedOnly ?? false,
          retryTicketIds: opts?.retryTicketIds,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok && res.status !== 207) {
        toast.push({
          title:
            typeof data.error === 'string' ? data.error : 'שיגור הביקור נכשל',
          tone: 'critical',
        })
        return
      }
      const visit = data.visit as VisitResult | undefined
      if (!visit?.items) {
        toast.push({ title: 'תשובה לא תקינה מהשרת', tone: 'critical' })
        return
      }
      setResult(visit)
      const failed = visit.items.filter((i) => i.can_retry).length
      if (failed === 0 && visit.status === 'dispatched') {
        toast.push({
          title: `ביקור שובץ · ${selectedTickets.length} תקלות`,
          tone: 'success',
        })
        selection?.clear()
        startTransition(() => router.refresh())
      } else if (failed > 0) {
        toast.push({
          title: `שיגור חלקי · ${failed} נכשלו`,
          tone: 'critical',
        })
        startTransition(() => router.refresh())
      } else {
        toast.push({
          title: 'ביקור עודכן',
          tone: 'neutral',
        })
        startTransition(() => router.refresh())
      }
    })
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
          onClick={openSheet}
        >
          <Truck className="h-3.5 w-3.5" aria-hidden />
          שיגור ביקור
        </Button>
      </div>

      <VisitConfirmSheet
        open={open}
        onOpenChange={(next) => {
          setOpen(next)
          if (!next) setResult(null)
        }}
        title="שיגור ביקור משולב"
        storeLabel={storeCodes[0] ? `חנות #${storeCodes[0]}` : 'חנות'}
        tickets={selectedTickets.map((t) => ({
          id: t.id,
          label: t.label,
          title: t.title,
          spendBlock: t.spendBlock,
        }))}
        vendors={vendors}
        vendorId={vendorId}
        onVendorIdChange={(id) => {
          setVendorId(id)
          if (storeIds[0]) {
            setIdempotencyKey(
              buildVisitIdempotencyKey({
                storeId: storeIds[0],
                vendorId: id,
                ticketIds: selectedTickets.map((t) => t.id),
              }),
            )
          }
        }}
        notes={notes}
        onNotesChange={setNotes}
        scheduledAt={scheduledAt}
        onScheduledAtChange={setScheduledAt}
        busy={busy}
        canSubmit={canOpen}
        result={result}
        onSubmit={() => void postVisit()}
        onRetryFailed={() =>
          void postVisit({ retryFailedOnly: true })
        }
        onRetryTicket={(ticketId) =>
          void postVisit({
            retryFailedOnly: true,
            retryTicketIds: [ticketId],
          })
        }
      />
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
