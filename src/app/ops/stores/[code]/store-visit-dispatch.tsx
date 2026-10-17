'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Truck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Panel } from '@/components/ui/primitives'
import { useToast } from '@/components/ui/toast'
import {
  VisitConfirmSheet,
  buildVisitIdempotencyKey,
  scheduledAtToIso,
  useSubmitGuard,
  type VisitResult,
} from '@/app/ops/tickets/visit-confirm-sheet'

type TicketOpt = {
  id: string
  label: string
  title: string
  spendBlock?: string | null
}
type VendorOpt = { id: string; name: string }

export function StoreVisitDispatch({
  storeId,
  storeCode,
  tickets,
  vendors,
}: {
  storeId: string
  storeCode: string
  tickets: TicketOpt[]
  vendors: VendorOpt[]
}) {
  const router = useRouter()
  const toast = useToast()
  const [, startTransition] = useTransition()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [open, setOpen] = useState(false)
  const [vendorId, setVendorId] = useState(vendors[0]?.id ?? '')
  const [notes, setNotes] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [result, setResult] = useState<VisitResult | null>(null)
  const [idempotencyKey, setIdempotencyKey] = useState<string | null>(null)
  const { busy, run } = useSubmitGuard()

  const selectedList = useMemo(
    () => tickets.filter((t) => selected.has(t.id)),
    [tickets, selected],
  )

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function openSheet() {
    if (selectedList.length === 0) return
    setResult(null)
    setIdempotencyKey(
      buildVisitIdempotencyKey({
        storeId,
        vendorId: vendorId || vendors[0]?.id || '',
        ticketIds: selectedList.map((t) => t.id),
      }),
    )
    setOpen(true)
  }

  async function postVisit(opts?: {
    retryFailedOnly?: boolean
    retryTicketIds?: string[]
  }) {
    if (selectedList.length === 0 || !vendorId) return
    const key =
      idempotencyKey ??
      buildVisitIdempotencyKey({
        storeId,
        vendorId,
        ticketIds: selectedList.map((t) => t.id),
      })
    setIdempotencyKey(key)

    await run(async () => {
      const res = await fetch('/api/ops/visits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          storeId,
          ticketIds: selectedList.map((t) => t.id),
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
          title: `ביקור שובץ לחנות #${storeCode}`,
          tone: 'success',
        })
        setSelected(new Set())
        startTransition(() => router.refresh())
      } else if (failed > 0) {
        toast.push({
          title: `שיגור חלקי · ${failed} נכשלו`,
          tone: 'critical',
        })
        startTransition(() => router.refresh())
      } else {
        startTransition(() => router.refresh())
      }
    })
  }

  return (
    <Panel elevated>
      <p className="t-section mb-3 text-ink">שיגור ביקור משולב</p>
      <ul className="mb-3 space-y-2">
        {tickets.map((t) => (
          <li key={t.id}>
            <label className="flex cursor-pointer items-start gap-2">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 accent-[var(--tenant)]"
                checked={selected.has(t.id)}
                onChange={() => toggle(t.id)}
              />
              <span className="min-w-0">
                <span className="t-caption t-num font-semibold text-ink">
                  {t.label}
                </span>
                <span className="t-body block line-clamp-1 text-ink-2">
                  {t.title}
                </span>
                {t.spendBlock ? (
                  <span className="t-caption block text-[var(--signal-critical)]">
                    {t.spendBlock}
                  </span>
                ) : null}
              </span>
            </label>
          </li>
        ))}
      </ul>
      <Button
        type="button"
        variant="primary"
        size="touch"
        className="w-full"
        disabled={selectedList.length === 0 || vendors.length === 0}
        onClick={openSheet}
      >
        <Truck className="h-4 w-4" aria-hidden />
        שיגור ביקור ({selectedList.length})
      </Button>

      <VisitConfirmSheet
        open={open}
        onOpenChange={(next) => {
          setOpen(next)
          if (!next) setResult(null)
        }}
        title={`ביקור · חנות #${storeCode}`}
        storeLabel={`חנות #${storeCode}`}
        tickets={selectedList}
        vendors={vendors}
        vendorId={vendorId}
        onVendorIdChange={(id) => {
          setVendorId(id)
          setIdempotencyKey(
            buildVisitIdempotencyKey({
              storeId,
              vendorId: id,
              ticketIds: selectedList.map((t) => t.id),
            }),
          )
        }}
        notes={notes}
        onNotesChange={setNotes}
        scheduledAt={scheduledAt}
        onScheduledAtChange={setScheduledAt}
        busy={busy}
        canSubmit={selectedList.length > 0}
        result={result}
        onSubmit={() => void postVisit()}
        onRetryFailed={() => void postVisit({ retryFailedOnly: true })}
        onRetryTicket={(ticketId) =>
          void postVisit({
            retryFailedOnly: true,
            retryTicketIds: [ticketId],
          })
        }
      />
    </Panel>
  )
}
