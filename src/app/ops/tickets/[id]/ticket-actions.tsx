'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import type { TicketStatus } from '@/modules/tickets/constants'
import { TICKET_STATUS_LABELS_HE } from '@/modules/tickets/constants'
import { nextStatuses } from '@/modules/tickets/transitions'
import { Button } from '@/components/ui/button'
import { Select, Field } from '@/components/ui/input'
import { ErrorState } from '@/components/ui/primitives'
import { useToast } from '@/components/ui/toast'

type Technician = { id: string; full_name: string | null; email: string | null }

/**
 * Action hierarchy matters: the forward move is primary, lateral moves are
 * secondary, and cancellation is a signal-coloured last resort. Previously all
 * transitions rendered as identical buttons, giving "cancel" the same weight
 * as "assign".
 */
function classifyTransition(to: TicketStatus): 'primary' | 'secondary' | 'critical' {
  if (to === 'cancelled') return 'critical'
  if (to === 'assigned' || to === 'in_progress' || to === 'resolved')
    return 'primary'
  return 'secondary'
}

function transitionLabel(from: TicketStatus, to: TicketStatus): string {
  if (to === 'assigned') return 'שיוך לטיפול'
  if (to === 'in_progress') return from === 'resolved' ? 'פתיחה מחדש' : 'התחלת טיפול'
  if (to === 'resolved') return 'סימון כנפתר'
  if (to === 'closed') return 'סגירה'
  if (to === 'cancelled') return 'ביטול תקלה'
  return TICKET_STATUS_LABELS_HE[to] ?? to
}

export function TicketActions({
  ticketId,
  status,
  assignedTo,
  technicians,
}: {
  ticketId: string
  status: TicketStatus
  assignedTo: string | null
  technicians: Technician[]
}) {
  const router = useRouter()
  const toast = useToast()
  const [pending, startTransition] = useTransition()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [profileId, setProfileId] = useState(assignedTo ?? '')

  const allowed = nextStatuses(status)
  const primary = allowed.filter((s) => classifyTransition(s) === 'primary')
  const secondary = allowed.filter((s) => classifyTransition(s) === 'secondary')
  const destructive = allowed.filter((s) => classifyTransition(s) === 'critical')

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
        return
      }
      toast.push({ title: successText, tone: 'success' })
      startTransition(() => router.refresh())
    } catch {
      setError('שגיאת רשת — בדקו את החיבור ונסו שוב')
      toast.push({ title: 'שגיאת רשת', tone: 'critical' })
    } finally {
      setBusy(false)
    }
  }

  const disabled = busy || pending
  const hasTechnicians = technicians.length > 0

  return (
    <div className="space-y-5">
      <Field label="טכנאי מטפל" htmlFor="ticket-assignee">
        {hasTechnicians ? (
          <div className="flex gap-2">
            <Select
              id="ticket-assignee"
              aria-label="טכנאי מטפל"
              value={profileId}
              disabled={disabled}
              onChange={(e) => {
                const next = e.target.value
                setProfileId(next)
                if (next) void patch({ assignedTo: next }, 'הטכנאי שויך')
              }}
            >
              <option value="">— ללא שיוך —</option>
              {technicians.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.full_name || t.email || t.id.slice(0, 8)}
                </option>
              ))}
            </Select>
          </div>
        ) : (
          <p className="t-body rounded-[var(--radius-md)] border border-border bg-canvas px-3 py-2 text-ink-2">
            אין טכנאים זמינים לשיוך. הוסיפו טכנאים במסד הנתונים כדי לשייך תקלות.
          </p>
        )}
      </Field>

      {allowed.length === 0 ? (
        <p className="t-body text-ink-2">התקלה הגיעה למצב סופי.</p>
      ) : (
        <div className="space-y-2">
          {primary.map((s) => (
            <Button
              key={s}
              type="button"
              variant={s === 'resolved' ? 'resolve' : 'primary'}
              size="block"
              disabled={disabled}
              onClick={() =>
                void patch({ status: s }, `הסטטוס עודכן ל${TICKET_STATUS_LABELS_HE[s]}`)
              }
            >
              {transitionLabel(status, s)}
            </Button>
          ))}

          {secondary.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {secondary.map((s) => (
                <Button
                  key={s}
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={disabled}
                  onClick={() =>
                    void patch(
                      { status: s },
                      `הסטטוס עודכן ל${TICKET_STATUS_LABELS_HE[s]}`,
                    )
                  }
                >
                  {transitionLabel(status, s)}
                </Button>
              ))}
            </div>
          ) : null}

          {destructive.map((s) => (
            <Button
              key={s}
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled}
              className="text-[var(--signal-critical)] hover:bg-[var(--signal-critical-soft)]"
              onClick={() => void patch({ status: s }, 'התקלה בוטלה')}
            >
              {transitionLabel(status, s)}
            </Button>
          ))}
        </div>
      )}

      {error ? <ErrorState title="לא ניתן לעדכן" description={error} /> : null}
    </div>
  )
}
