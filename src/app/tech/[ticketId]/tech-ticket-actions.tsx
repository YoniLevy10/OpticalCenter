'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { TICKET_STATUS_LABELS_HE, type TicketStatus } from '@/modules/tickets/constants'
import { nextStatusActions } from '@/modules/tickets/tech'

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
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          כדי לעדכן סטטוס הוסיפו <code className="text-xs">?techId=...</code> לכתובת.
        </p>
      ) : null}

      {isUnassigned && canAct ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => void submit({ claim: true })}
          className="w-full rounded-xl bg-sky-700 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          תפיסת עבודה
        </button>
      ) : null}

      {(isMine || isUnassigned) && actions.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-medium text-zinc-500">עדכון סטטוס</p>
          <div className="flex flex-col gap-2">
            {actions.map((next) => (
              <button
                key={next}
                type="button"
                disabled={pending || !canAct}
                onClick={() =>
                  void submit({ status: next, claim: isUnassigned ? true : undefined })
                }
                className={
                  next === 'resolved'
                    ? 'w-full rounded-xl bg-emerald-700 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60'
                    : 'w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm font-medium text-zinc-800 disabled:opacity-60'
                }
              >
                {statusActionLabel(status as TicketStatus, next)}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {status === 'resolved' ? (
        <p className="text-sm text-emerald-700">העבודה סומנה כהושלמה.</p>
      ) : null}

      <div className="space-y-2">
        <label htmlFor="tech-note" className="block text-xs font-medium text-zinc-500">
          הערה
        </label>
        <textarea
          id="tech-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="מה בוצע בשטח…"
          className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-500"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="tech-photo" className="block text-xs font-medium text-zinc-500">
          קישור לתמונה (אופציונלי)
        </label>
        <input
          id="tech-photo"
          type="url"
          value={photoUrl}
          onChange={(e) => setPhotoUrl(e.target.value)}
          placeholder="https://…"
          className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-500"
          dir="ltr"
        />
        <p className="text-[11px] text-zinc-400">MVP: ללא העלאה — הדביקו URL או דלגו.</p>
      </div>

      <button
        type="button"
        disabled={pending || !canAct || (!note.trim() && !photoUrl.trim())}
        onClick={() => void submit(isUnassigned ? { claim: true } : {})}
        className="w-full rounded-xl border border-zinc-300 bg-zinc-50 px-4 py-3 text-sm font-medium text-zinc-800 disabled:opacity-50"
      >
        שמירת הערה / תמונה
      </button>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
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
