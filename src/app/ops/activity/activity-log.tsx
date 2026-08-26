'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { Field, Select } from '@/components/ui/input'
import { EmptyState, Panel } from '@/components/ui/primitives'

const EVENT_HE: Record<string, string> = {
  created: 'נוצרה',
  assigned: 'שויכה',
  status_changed: 'שינוי סטטוס',
  sla_breached: 'הפרת SLA',
  partner_dispatched: 'שיגור לספק',
  note_added: 'הערה',
  photo_added: 'תמונה',
}

type AuditEvent = {
  id: string
  event_type: string
  ticket_id: string
  ticket_display?: string | null
  payload: unknown
  created_at: string
}

function fmt(iso: string) {
  try {
    return format(new Date(iso), 'dd/MM HH:mm')
  } catch {
    return iso
  }
}

export function ActivityLog({ events }: { events: AuditEvent[] }) {
  const [filter, setFilter] = useState('')

  const types = useMemo(() => {
    const set = new Set(events.map((e) => e.event_type))
    return Array.from(set).sort()
  }, [events])

  const filtered = useMemo(
    () => (filter ? events.filter((e) => e.event_type === filter) : events),
    [events, filter],
  )

  return (
    <>
      {types.length > 1 ? (
        <Field label="סינון לפי סוג" htmlFor="activity-filter">
          <Select
            id="activity-filter"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="max-w-xs"
          >
            <option value="">כל האירועים</option>
            {types.map((t) => (
              <option key={t} value={t}>
                {EVENT_HE[t] ?? t}
              </option>
            ))}
          </Select>
        </Field>
      ) : null}

      <Panel flush elevated className="overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState
            title="אין אירועים"
            description={
              filter
                ? 'נסו לבחור סוג אירוע אחר.'
                : 'פעולות על תקלות יופיעו כאן כיומן מרכזי.'
            }
          />
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((e) => (
              <li key={e.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="t-body-strong text-ink">
                      {EVENT_HE[e.event_type] ?? e.event_type}
                      {e.ticket_display ? (
                        <>
                          {' · '}
                          <Link
                            href={`/ops/tickets/${e.ticket_id}`}
                            className="text-[var(--tenant)] hover:underline"
                          >
                            {e.ticket_display}
                          </Link>
                        </>
                      ) : null}
                    </p>
                    <details className="t-meta mt-0.5 text-ink-3">
                      <summary className="cursor-pointer hover:text-ink-2">
                        פרטים
                      </summary>
                      <p className="mt-1 truncate" dir="ltr">
                        {JSON.stringify(e.payload).slice(0, 240)}
                      </p>
                    </details>
                  </div>
                  <time
                    dateTime={e.created_at}
                    className="t-caption t-num shrink-0 text-ink-3"
                  >
                    {fmt(e.created_at)}
                  </time>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  )
}
