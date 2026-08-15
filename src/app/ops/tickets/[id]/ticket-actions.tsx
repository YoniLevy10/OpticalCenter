'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { TicketStatus } from '@/modules/tickets/constants'
import { TICKET_STATUS_LABELS_HE } from '@/modules/tickets/constants'
import { nextStatuses } from '@/modules/tickets/transitions'
import { Button } from '@/components/ui/button'
import { Select, Input } from '@/components/ui/input'
import { BottomSheet } from '@/components/ui/overlay'
import { useToast } from '@/components/ui/toast'

type Technician = { id: string; full_name: string | null; email: string | null }

export function TicketActions({
  ticketId,
  status,
  assignedTo,
  technicians,
  stickyMobile = false,
}: {
  ticketId: string
  status: TicketStatus
  assignedTo: string | null
  technicians: Technician[]
  stickyMobile?: boolean
}) {
  const router = useRouter()
  const toast = useToast()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [profileId, setProfileId] = useState(assignedTo ?? '')
  const [sheet, setSheet] = useState<'status' | 'assign' | null>(null)
  const allowed = nextStatuses(status)

  async function patch(body: Record<string, unknown>) {
    setError(null)
    const res = await fetch(`/api/tickets/${ticketId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(data.error ?? 'שגיאה בעדכון')
      return
    }
    toast.push({ title: 'התקלה עודכנה', tone: 'success' })
    setSheet(null)
    startTransition(() => router.refresh())
  }

  const desktopPanel = (
    <div className="space-y-5">
      <section>
        <h3 className="mb-2 text-[12px] font-medium text-muted">עדכון סטטוס</h3>
        {allowed.length === 0 ? (
          <p className="text-[13px] text-muted">אין מעברים נוספים.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {allowed.map((s) => (
              <Button
                key={s}
                type="button"
                size="sm"
                disabled={pending}
                onClick={() => void patch({ status: s })}
              >
                {TICKET_STATUS_LABELS_HE[s]}
              </Button>
            ))}
          </div>
        )}
      </section>
      <section>
        <h3 className="mb-2 text-[12px] font-medium text-muted">שיוך טכנאי</h3>
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (!profileId.trim()) {
              setError('יש לבחור טכנאי')
              return
            }
            void patch({ assignedTo: profileId.trim() })
          }}
        >
          {technicians.length > 0 ? (
            <Select
              value={profileId}
              onChange={(e) => setProfileId(e.target.value)}
            >
              <option value="">— בחירה —</option>
              {technicians.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.full_name || t.email || t.id}
                </option>
              ))}
            </Select>
          ) : (
            <Input
              value={profileId}
              onChange={(e) => setProfileId(e.target.value)}
              placeholder="UUID טכנאי"
              dir="ltr"
            />
          )}
          <Button type="submit" variant="primary" size="sm" disabled={pending}>
            שייך
          </Button>
        </form>
      </section>
      {error ? <p className="text-[12px] text-danger">{error}</p> : null}
    </div>
  )

  if (!stickyMobile) return desktopPanel

  return (
    <>
      <div
        className="fixed inset-x-0 z-20 border-t border-border bg-surface p-3 md:hidden"
        style={{
          bottom: 'calc(var(--mobile-bottom-nav-height) + env(safe-area-inset-bottom))',
        }}
      >
        <div className="mx-auto flex max-w-lg gap-2">
          <Button
            type="button"
            size="lg"
            className="flex-1"
            onClick={() => setSheet('status')}
          >
            סטטוס
          </Button>
          <Button
            type="button"
            variant="primary"
            size="lg"
            className="flex-1"
            onClick={() => setSheet('assign')}
          >
            שייך
          </Button>
        </div>
      </div>

      <BottomSheet
        open={sheet === 'status'}
        onOpenChange={(v) => setSheet(v ? 'status' : null)}
        title="עדכון סטטוס"
      >
        <div className="grid gap-2">
          {allowed.length === 0 ? (
            <p className="text-[13px] text-muted">אין מעברים נוספים.</p>
          ) : (
            allowed.map((s) => (
              <Button
                key={s}
                type="button"
                size="lg"
                disabled={pending}
                onClick={() => void patch({ status: s })}
              >
                {TICKET_STATUS_LABELS_HE[s]}
              </Button>
            ))
          )}
        </div>
      </BottomSheet>

      <BottomSheet
        open={sheet === 'assign'}
        onOpenChange={(v) => setSheet(v ? 'assign' : null)}
        title="שיוך טכנאי"
      >
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            if (!profileId.trim()) {
              setError('יש לבחור טכנאי')
              return
            }
            void patch({ assignedTo: profileId.trim() })
          }}
        >
          {technicians.length > 0 ? (
            <Select
              value={profileId}
              onChange={(e) => setProfileId(e.target.value)}
            >
              <option value="">— בחירה —</option>
              {technicians.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.full_name || t.email || t.id}
                </option>
              ))}
            </Select>
          ) : (
            <Input
              value={profileId}
              onChange={(e) => setProfileId(e.target.value)}
              placeholder="UUID טכנאי"
              dir="ltr"
            />
          )}
          <Button type="submit" variant="primary" size="lg" disabled={pending}>
            שייך עכשיו
          </Button>
          {error ? <p className="text-[12px] text-danger">{error}</p> : null}
        </form>
      </BottomSheet>
    </>
  )
}
