'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Truck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BottomSheet } from '@/components/ui/overlay'
import { Panel } from '@/components/ui/primitives'
import { useToast } from '@/components/ui/toast'

type TicketOpt = { id: string; label: string; title: string }
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
  const [busy, setBusy] = useState(false)

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

  async function dispatchVisit() {
    if (selectedList.length === 0 || !vendorId) return
    setBusy(true)
    try {
      const res = await fetch('/api/ops/visits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          storeId,
          ticketIds: selectedList.map((t) => t.id),
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
        title: `ביקור שובץ לחנות #${storeCode}`,
        tone: 'success',
      })
      setSelected(new Set())
      setOpen(false)
      startTransition(() => router.refresh())
    } catch {
      toast.push({ title: 'שגיאת רשת', tone: 'critical' })
    } finally {
      setBusy(false)
    }
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
        onClick={() => setOpen(true)}
      >
        <Truck className="h-4 w-4" aria-hidden />
        שיגור ביקור ({selectedList.length})
      </Button>

      <BottomSheet
        open={open}
        onOpenChange={setOpen}
        title={`ביקור · חנות #${storeCode}`}
      >
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="t-caption text-ink-2">ספק</span>
            <select
              className="t-control min-h-[var(--tap)] rounded-[var(--radius-md)] border border-border bg-surface px-3 text-ink"
              value={vendorId}
              onChange={(e) => setVendorId(e.target.value)}
              disabled={busy}
            >
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="t-caption text-ink-2">הערה</span>
            <textarea
              className="t-control min-h-[5rem] rounded-[var(--radius-md)] border border-border bg-surface px-3 py-2 text-ink"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={busy}
            />
          </label>
          <Button
            type="button"
            variant="primary"
            size="touch"
            disabled={busy || !vendorId}
            onClick={() => void dispatchVisit()}
          >
            אישור שיגור
          </Button>
        </div>
      </BottomSheet>
    </Panel>
  )
}
