'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import type { TicketStatus } from '@/modules/tickets/constants'
import { TICKET_STATUS_LABELS_HE } from '@/modules/tickets/constants'
import { nextStatuses } from '@/modules/tickets/transitions'

type Technician = { id: string; full_name: string | null; email: string | null }

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
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [profileId, setProfileId] = useState(assignedTo ?? '')
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
    startTransition(() => router.refresh())
  }

  return (
    <div className="space-y-4">
      <section>
        <h3 className="mb-2 text-xs font-medium text-zinc-500">עדכון סטטוס</h3>
        {allowed.length === 0 ? (
          <p className="text-sm text-zinc-500">אין מעברים נוספים ממצב זה.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {allowed.map((s) => (
              <button
                key={s}
                type="button"
                disabled={pending}
                onClick={() => void patch({ status: s })}
                className="rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
              >
                {TICKET_STATUS_LABELS_HE[s]}
              </button>
            ))}
          </div>
        )}
      </section>

      <section>
        <h3 className="mb-2 text-xs font-medium text-zinc-500">שיוך טכנאי</h3>
        <form
          className="flex flex-col gap-2 sm:flex-row sm:items-end"
          onSubmit={(e) => {
            e.preventDefault()
            if (!profileId.trim()) {
              setError('יש להזין מזהה פרופיל טכנאי')
              return
            }
            void patch({ assignedTo: profileId.trim() })
          }}
        >
          {technicians.length > 0 ? (
            <label className="flex-1 text-xs text-zinc-600">
              טכנאי פנימי
              <select
                className="mt-1 w-full rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm"
                value={profileId}
                onChange={(e) => setProfileId(e.target.value)}
              >
                <option value="">— בחירה —</option>
                {technicians.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.full_name || t.email || t.id}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <label className="flex-1 text-xs text-zinc-600">
              מזהה פרופיל (UUID)
              <input
                className="mt-1 w-full rounded-md border border-zinc-200 bg-white px-2 py-1.5 font-mono text-sm"
                value={profileId}
                onChange={(e) => setProfileId(e.target.value)}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                dir="ltr"
              />
            </label>
          )}
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
          >
            שייך
          </button>
        </form>
      </section>

      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  )
}
