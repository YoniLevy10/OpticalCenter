'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Truck } from 'lucide-react'
import { MidragSearchAction } from '@/components/ops/midrag-search-action'
import { Button } from '@/components/ui/button'
import { BottomSheet } from '@/components/ui/overlay'
import { PhoneCallLink } from '@/components/ui/phone-call-link'
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
type PersonOption = {
  id: string
  full_name: string
  phone: string | null
  trade: string | null
}

function VisitBarInner({
  vendors,
  professionals,
  storeFilter,
}: {
  vendors: VendorOption[]
  professionals: PersonOption[]
  storeFilter?: string
}) {
  const router = useRouter()
  const toast = useToast()
  const selection = useVisitSelection()
  const [, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const [peopleOpen, setPeopleOpen] = useState(false)
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

  const sameStore = storeCodes.length === 1 && storeIds.length <= 1
  const canChoosePerson = selectedTickets.length > 0 && sameStore
  const canOpen = canChoosePerson && storeIds.length === 1

  if (!selection) return null
  if (selectedTickets.length === 0) {
    return (
      <p className="t-caption hidden text-ink-3 md:block">
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
            typeof data.error === 'string'
              ? data.error
              : res.status === 400
                ? 'בקשה לא תקינה — בדקו מזהי חנות/תקלה/ספק'
                : 'שיגור הביקור נכשל',
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
      <div className="flex flex-wrap items-center gap-2 rounded-[var(--radius-md)] border border-[var(--tenant-line)] bg-[var(--tenant-soft)] px-3 py-2.5">
        <p className="t-body flex-1 text-ink">
          ביקור משולב · נבחרו{' '}
          <span className="t-num font-semibold">{selectedTickets.length}</span>
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
          disabled={!canChoosePerson}
          onClick={() => {
            if (vendors.length === 0 || !canOpen) {
              setPeopleOpen(true)
              return
            }
            openSheet()
          }}
        >
          <Truck className="h-3.5 w-3.5" aria-hidden />
          {vendors.length === 0 ? 'בחר איש מקצוע' : 'שיגור ביקור'}
        </Button>
      </div>

      <BottomSheet
        open={peopleOpen}
        onOpenChange={setPeopleOpen}
        title="איש מקצוע"
        description="אין ספק לשיגור אוטומטי. בחרו מהמאגר, או חפשו במידרג."
        detent="half"
      >
        <div className="grid gap-4">
          <div className="grid gap-2">
            <p className="t-body-strong text-ink">מהמאגר שלנו</p>
            {professionals.length === 0 ? (
              <p className="t-meta text-ink-2">אין עדיין אנשי מקצוע שמורים.</p>
            ) : (
              <ul className="divide-y divide-border">
                {professionals.slice(0, 5).map((person) => (
                  <li key={person.id} className="flex items-center justify-between gap-3 py-2">
                    <span className="min-w-0">
                      <span className="t-body block truncate text-ink">{person.full_name}</span>
                      {person.trade ? (
                        <span className="t-meta block text-ink-3">{person.trade}</span>
                      ) : null}
                    </span>
                    {person.phone ? <PhoneCallLink phone={person.phone} label="חיוג" /> : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="grid gap-2">
            <p className="t-body-strong text-ink">מידרג</p>
            <MidragSearchAction
              category={selectedTickets[0]?.category || 'other'}
              city={selectedTickets[0]?.city}
              compact
            />
          </div>
        </div>
      </BottomSheet>

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
  professionals = [],
  storeFilter,
}: {
  tickets: VisitSelectableTicket[]
  vendors: VendorOption[]
  professionals?: PersonOption[]
  storeFilter?: string
}) {
  return (
    <VisitSelectionProvider tickets={tickets}>
      <VisitBarInner
        vendors={vendors}
        professionals={professionals}
        storeFilter={storeFilter}
      />
    </VisitSelectionProvider>
  )
}

/** Shared shell so the bar and queue rows share one selection set. */
export function VisitQueueShell({
  tickets,
  vendors,
  professionals = [],
  storeFilter,
  children,
}: {
  tickets: VisitSelectableTicket[]
  vendors: VendorOption[]
  professionals?: PersonOption[]
  storeFilter?: string
  children: React.ReactNode
}) {
  return (
    <VisitSelectionProvider tickets={tickets}>
      <div className="flex flex-col gap-3">
        <VisitBarInner
          vendors={vendors}
          professionals={professionals}
          storeFilter={storeFilter}
        />
        {children}
      </div>
    </VisitSelectionProvider>
  )
}
