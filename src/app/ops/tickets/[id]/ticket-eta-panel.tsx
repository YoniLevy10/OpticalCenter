'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Panel } from '@/components/ui/primitives'
import { useToast } from '@/components/ui/toast'
import { useLocale } from '@/components/i18n/locale-provider'
import { formatRepairEtaHe } from '@/modules/tickets/repair-eta'

/** B04 — HQ sets repair ETA visible to store. */
export function TicketEtaPanel({
  ticketId,
  initialEtaAt,
  status,
}: {
  ticketId: string
  initialEtaAt: string | null
  status: string
}) {
  const { t } = useLocale()
  const toast = useToast()
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [busy, setBusy] = useState(false)
  const [etaLocal, setEtaLocal] = useState(() => toDatetimeLocal(initialEtaAt))
  const closed = status === 'closed' || status === 'cancelled'

  async function save() {
    if (busy || pending || closed) return
    setBusy(true)
    try {
      const iso = etaLocal ? new Date(etaLocal).toISOString() : null
      const res = await fetch(`/api/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ repairEtaAt: iso }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.push({
          title: typeof data.error === 'string' ? data.error : 'עדכון נכשל',
          tone: 'critical',
        })
        return
      }
      toast.push({ title: 'מועד הגעה עודכן', tone: 'success' })
      startTransition(() => router.refresh())
    } finally {
      setBusy(false)
    }
  }

  return (
    <Panel elevated>
      <p className="t-section mb-1 text-ink">{t('ticket.eta')}</p>
      <p className="t-meta mb-3 text-ink-2">
        {initialEtaAt
          ? formatRepairEtaHe(initialEtaAt)
          : t('ticket.etaEmpty')}
      </p>
      {!closed ? (
        <div className="flex flex-wrap items-end gap-2">
          <Input
            type="datetime-local"
            value={etaLocal}
            onChange={(e) => setEtaLocal(e.target.value)}
            aria-label={t('ticket.eta')}
            className="max-w-xs"
          />
          <Button
            type="button"
            variant="secondary"
            disabled={busy || pending}
            onClick={() => void save()}
          >
            {t('ticket.etaSet')}
          </Button>
        </div>
      ) : null}
    </Panel>
  )
}

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
