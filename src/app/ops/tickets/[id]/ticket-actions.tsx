'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState, useTransition } from 'react'
import { Check, UserPlus, UserRoundPen } from 'lucide-react'
import type { TicketStatus } from '@/modules/tickets/constants'
import { OPEN_TICKET_STATUSES } from '@/modules/tickets/constants'
import { Button } from '@/components/ui/button'
import { BottomSheet } from '@/components/ui/overlay'
import { ErrorState } from '@/components/ui/primitives'
import { useToast } from '@/components/ui/toast'
import { isTicketResolved } from '@/components/ops/plain-labels'

type Technician = {
  id: string
  full_name: string | null
  email: string | null
  openCount?: number
}

export function TicketActions({
  ticketId,
  status,
  assignedTo,
  assigneeName,
  technicians,
}: {
  ticketId: string
  status: TicketStatus
  assignedTo: string | null
  assigneeName?: string | null
  technicians: Technician[]
  /** Kept for call-site compatibility; unused in the simplified UI. */
  assigneeFieldId?: string
}) {
  const router = useRouter()
  const toast = useToast()
  const [pending, startTransition] = useTransition()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [assignOpen, setAssignOpen] = useState(false)
  const [localAssignedTo, setLocalAssignedTo] = useState(assignedTo)
  const [localAssigneeName, setLocalAssigneeName] = useState(
    assigneeName ?? null,
  )
  const [localStatus, setLocalStatus] = useState(status)

  useEffect(() => {
    setLocalAssignedTo(assignedTo)
  }, [assignedTo])

  useEffect(() => {
    setLocalAssigneeName(assigneeName ?? null)
  }, [assigneeName])

  useEffect(() => {
    setLocalStatus(status)
  }, [status])

  const resolved = isTicketResolved(localStatus) || localStatus === 'cancelled'
  const open = OPEN_TICKET_STATUSES.includes(localStatus)
  const unassigned = !localAssignedTo

  const sortedTechs = useMemo(
    () =>
      [...technicians].sort(
        (a, b) => (a.openCount ?? 0) - (b.openCount ?? 0),
      ),
    [technicians],
  )

  const shownAssignee =
    localAssigneeName ||
    sortedTechs.find((t) => t.id === localAssignedTo)?.full_name ||
    sortedTechs.find((t) => t.id === localAssignedTo)?.email ||
    null

  async function patch(body: Record<string, unknown>, successText: string) {
    setError(null)
    setBusy(true)
    try {
      const res = await fetch(`/api/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error ?? 'העדכון נכשל')
        toast.push({ title: 'העדכון נכשל', tone: 'critical' })
        return false
      }
      toast.push({ title: successText, tone: 'success' })
      startTransition(() => router.refresh())
      return true
    } catch {
      setError('שגיאת רשת — בדקו את החיבור ונסו שוב')
      toast.push({ title: 'שגיאת רשת', tone: 'critical' })
      return false
    } finally {
      setBusy(false)
    }
  }

  const disabled = busy || pending

  if (resolved) {
    return (
      <div className="t-body flex items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[color-mix(in_srgb,var(--signal-resolved)_28%,transparent)] bg-[var(--signal-resolved-soft)] px-4 py-3 text-[var(--signal-resolved)]">
        <Check className="h-4 w-4" aria-hidden />
        התקלה הסתיימה ✓
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {!unassigned && shownAssignee ? (
        <p className="t-body rounded-[var(--radius-md)] bg-surface-sunken px-3 py-2 text-ink">
          משויך ל: <span className="t-body-strong">{shownAssignee}</span>
        </p>
      ) : null}

      {unassigned ? (
        <Button
          type="button"
          variant="primary"
          size="touch"
          className="w-full"
          disabled={disabled || sortedTechs.length === 0}
          onClick={() => setAssignOpen(true)}
        >
          <UserPlus className="h-4 w-4" aria-hidden />
          שייך טכנאי
        </Button>
      ) : null}

      {!unassigned && open ? (
        <Button
          type="button"
          variant="secondary"
          size="touch"
          className="w-full"
          disabled={disabled || sortedTechs.length === 0}
          onClick={() => setAssignOpen(true)}
        >
          <UserRoundPen className="h-4 w-4" aria-hidden />
          החלף טכנאי
        </Button>
      ) : null}

      {!unassigned && open ? (
        <Button
          type="button"
          variant="secondary"
          size="touch"
          className="w-full"
          disabled={disabled}
          onClick={() =>
            void (async () => {
              const ok = await patch({ status: 'resolved' }, 'התקלה הסתיימה')
              if (ok) setLocalStatus('resolved')
            })()
          }
        >
          סגור תקלה
        </Button>
      ) : null}

      {sortedTechs.length === 0 && unassigned ? (
        <p className="t-body text-ink-2">
          אין טכנאים זמינים. הוסיפו טכנאים במסך המשתמשים.
        </p>
      ) : null}

      {error ? <ErrorState title="לא ניתן לעדכן" description={error} /> : null}

      <BottomSheet
        open={assignOpen}
        onOpenChange={setAssignOpen}
        title={unassigned ? 'שייך טכנאי' : 'החלף טכנאי'}
      >
        <ul className="divide-y divide-border">
          {sortedTechs.map((t) => {
            const label = t.full_name || t.email || t.id.slice(0, 8)
            const selected = t.id === localAssignedTo
            return (
              <li key={t.id}>
                <button
                  type="button"
                  disabled={disabled || selected}
                  onClick={() => {
                    void (async () => {
                      const ok = await patch(
                        { assignedTo: t.id },
                        'הטכנאי שויך',
                      )
                      if (ok) {
                        setLocalAssignedTo(t.id)
                        setLocalAssigneeName(label)
                        setLocalStatus('assigned')
                        setAssignOpen(false)
                      }
                    })()
                  }}
                  className="flex w-full min-h-[var(--tap)] items-center gap-3 px-1 py-3 text-start transition-colors hover:bg-surface-sunken/40 disabled:opacity-60"
                >
                  <span className="t-body-strong">
                    {label}
                    {selected ? ' · נוכחי' : ''}
                  </span>
                  <span className="t-meta ms-auto text-ink-3">
                    {(t.openCount ?? 0) === 0
                      ? 'אין תקלות פתוחות'
                      : `${t.openCount} תקלות פתוחות`}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </BottomSheet>
    </div>
  )
}
