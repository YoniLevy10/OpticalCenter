'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { TICKET_STATUS_LABELS_HE, type TicketStatus } from '@/modules/tickets/constants'
import { nextStatusActions } from '@/modules/tickets/tech'
import { Button } from '@/components/ui/button'
import { Input, Textarea } from '@/components/ui/input'

export function TechTicketActions({
  ticketId,
  techId,
  status,
  assignedTo,
}: {
  ticketId: string
  techId: string | null
  status: string
  assignedTo: string | null
}) {
  const router = useRouter()
  const [note, setNote] = useState('')
  const [photoUrl, setPhotoUrl] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const canAct = Boolean(techId)
  const isMine = Boolean(techId && assignedTo === techId)
  const isUnassigned = !assignedTo
  const actions = nextStatusActions(status)

  async function submit(body: Record<string, unknown>) {
    if (!techId) {
      setError('חסר techId')
      return
    }
    setError(null)
    setMessage(null)
    try {
      const res = await fetch(`/api/tech/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          techId,
          note: note.trim() || undefined,
          resolution_note: note.trim() || undefined,
          photoUrl: photoUrl.trim() || undefined,
          ...body,
        }),
      })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) {
        setError(data.error ?? 'העדכון נכשל')
        return
      }
      setMessage('נשמר בהצלחה')
      setNote('')
      setPhotoUrl('')
      startTransition(() => router.refresh())
    } catch {
      setError('שגיאת רשת')
    }
  }

  return (
    <div className="space-y-4">
      {!canAct ? (
        <p className="rounded-[var(--radius-md)] border border-warning/30 bg-warning-soft px-3 py-2 text-[13px] text-warning">
          כדי לעדכן סטטוס הוסיפו <code className="text-[12px]">?techId=...</code> לכתובת.
        </p>
      ) : null}

      {isUnassigned && canAct ? (
        <Button
          type="button"
          variant="primary"
          size="lg"
          disabled={pending}
          onClick={() => void submit({ claim: true })}
        >
          תפיסת עבודה
        </Button>
      ) : null}

      {(isMine || isUnassigned) && actions.length > 0 ? (
        <div className="space-y-2">
          <p className="text-[12px] font-medium text-muted">עדכון סטטוס</p>
          <div className="flex flex-col gap-2">
            {actions.map((next) => (
              <Button
                key={next}
                type="button"
                size="lg"
                variant={next === 'resolved' ? 'primary' : 'default'}
                disabled={pending || !canAct}
                onClick={() =>
                  void submit({ status: next, claim: isUnassigned ? true : undefined })
                }
              >
                {statusActionLabel(status as TicketStatus, next)}
              </Button>
            ))}
          </div>
        </div>
      ) : null}

      {status === 'resolved' ? (
        <p className="text-[13px] text-success">העבודה סומנה כהושלמה.</p>
      ) : null}

      <div className="space-y-2">
        <label htmlFor="tech-note" className="block text-[12px] font-medium text-muted">
          הערת פתרון / שטח
        </label>
        <Textarea
          id="tech-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="מה בוצע בשטח… (חובה מומלצת בסיום)"
          className="min-h-[96px] text-[16px] md:text-[13px]"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="tech-photo" className="block text-[12px] font-medium text-muted">
          קישור לתמונה (אופציונלי)
        </label>
        <Input
          id="tech-photo"
          type="url"
          value={photoUrl}
          onChange={(e) => setPhotoUrl(e.target.value)}
          placeholder="https://…"
          dir="ltr"
        />
        <p className="text-[11px] text-faint">MVP: ללא העלאה — הדביקו URL או דלגו.</p>
      </div>

      <Button
        type="button"
        size="lg"
        disabled={pending || !canAct || (!note.trim() && !photoUrl.trim())}
        onClick={() => void submit(isUnassigned ? { claim: true } : {})}
      >
        שמירת הערה / תמונה
      </Button>

      {error ? (
        <p className="rounded-[var(--radius-md)] border border-danger/20 bg-danger-soft px-3 py-2 text-[13px] text-danger">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="rounded-[var(--radius-md)] border border-success/20 bg-success-soft px-3 py-2 text-[13px] text-success">
          {message}
        </p>
      ) : null}
    </div>
  )
}

function statusActionLabel(from: TicketStatus | string, to: TicketStatus): string {
  if (from === 'assigned' && to === 'in_progress') return 'התחלת טיפול'
  if (to === 'waiting_parts') return 'ממתין לחלקים'
  if (to === 'in_progress') return 'חזרה לטיפול'
  if (to === 'resolved') return `סיום · ${TICKET_STATUS_LABELS_HE.resolved}`
  return TICKET_STATUS_LABELS_HE[to] ?? to
}
