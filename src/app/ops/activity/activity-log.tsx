'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { format, isSameDay, parseISO, startOfDay } from 'date-fns'
import { he } from 'date-fns/locale'
import { Field, Input, Select } from '@/components/ui/input'
import { EmptyState, Panel } from '@/components/ui/primitives'
import {
  TICKET_STATUS_LABELS_HE,
  type TicketStatus,
} from '@/modules/tickets/constants'

const EVENT_HE: Record<string, string> = {
  created: 'נוצרה',
  assigned: 'שויכה',
  status_changed: 'שינוי סטטוס',
  sla_breached: 'הפרת SLA',
  partner_dispatched: 'שיגור לספק',
  note_added: 'הערה',
  photo_added: 'תמונה',
}

export type AuditEvent = {
  id: string
  event_type: string
  ticket_id: string
  ticket_display?: string | null
  actor_id?: string | null
  payload: unknown
  created_at: string
}

function statusHe(raw: unknown): string {
  const key = String(raw ?? '')
  return TICKET_STATUS_LABELS_HE[key as TicketStatus] ?? (key || '—')
}

/** Human phrasing instead of raw JSON. */
export function phraseEvent(e: AuditEvent): string {
  const p =
    e.payload && typeof e.payload === 'object'
      ? (e.payload as Record<string, unknown>)
      : {}

  switch (e.event_type) {
    case 'status_changed': {
      const to = p.to ?? p.to_status
      return `שינוי סטטוס ל־${statusHe(to)}`
    }
    case 'assigned':
      return 'שויכה לטכנאי'
    case 'created': {
      const source = p.source ? String(p.source) : null
      return source ? `תקלה נוצרה (${source})` : 'תקלה נוצרה'
    }
    case 'sla_breached':
      return 'חריגת SLA'
    case 'partner_dispatched': {
      const name = p.vendor_name ? String(p.vendor_name) : null
      return name ? `שיגור ל־${name}` : 'שיגור לספק חיצוני'
    }
    case 'note_added':
      return 'נוספה הערה'
    case 'photo_added':
      return 'נוספה תמונה'
    default:
      return EVENT_HE[e.event_type] ?? e.event_type
  }
}

function actorLabel(actorId: string | null | undefined) {
  if (!actorId) return 'מערכת'
  if (actorId.length <= 10) return actorId
  return `${actorId.slice(0, 8)}…`
}

function fmtTime(iso: string) {
  try {
    return format(parseISO(iso), 'HH:mm')
  } catch {
    return iso
  }
}

function fmtDayLabel(iso: string) {
  try {
    const d = parseISO(iso)
    if (isSameDay(d, new Date())) return 'היום'
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    if (isSameDay(d, yesterday)) return 'אתמול'
    return format(d, 'EEEE, d בMMMM', { locale: he })
  } catch {
    return iso
  }
}

function dayKey(iso: string) {
  try {
    return startOfDay(parseISO(iso)).toISOString()
  } catch {
    return iso.slice(0, 10)
  }
}

export function ActivityLog({ events }: { events: AuditEvent[] }) {
  const [actionType, setActionType] = useState('')
  const [actor, setActor] = useState('')
  const [date, setDate] = useState('')
  const [entity, setEntity] = useState('')

  const types = useMemo(() => {
    const set = new Set(events.map((e) => e.event_type))
    return Array.from(set).sort()
  }, [events])

  const actors = useMemo(() => {
    const set = new Set(
      events.map((e) => e.actor_id).filter((id): id is string => Boolean(id)),
    )
    return Array.from(set).sort()
  }, [events])

  const filtered = useMemo(() => {
    return events.filter((e) => {
      if (actionType && e.event_type !== actionType) return false
      if (actor === '__system__' && e.actor_id) return false
      if (actor && actor !== '__system__' && e.actor_id !== actor) return false
      if (date) {
        try {
          if (!isSameDay(parseISO(e.created_at), parseISO(date))) return false
        } catch {
          return false
        }
      }
      if (entity) {
        const q = entity.trim().toLowerCase()
        const hay = `${e.ticket_display ?? ''} ${e.ticket_id}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [events, actionType, actor, date, entity])

  const groups = useMemo(() => {
    const map = new Map<string, AuditEvent[]>()
    for (const e of filtered) {
      const key = dayKey(e.created_at)
      const list = map.get(key) ?? []
      list.push(e)
      map.set(key, list)
    }
    return Array.from(map.entries()).map(([key, items]) => ({
      key,
      label: fmtDayLabel(items[0]!.created_at),
      items,
    }))
  }, [filtered])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <Field label="סוג פעולה" htmlFor="activity-type">
          <Select
            id="activity-type"
            value={actionType}
            onChange={(e) => setActionType(e.target.value)}
            className="min-w-[10rem]"
          >
            <option value="">הכל</option>
            {types.map((t) => (
              <option key={t} value={t}>
                {EVENT_HE[t] ?? t}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="משתמש" htmlFor="activity-actor">
          <Select
            id="activity-actor"
            value={actor}
            onChange={(e) => setActor(e.target.value)}
            className="min-w-[10rem]"
          >
            <option value="">הכל</option>
            <option value="__system__">מערכת</option>
            {actors.map((id) => (
              <option key={id} value={id}>
                {actorLabel(id)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="תאריך" htmlFor="activity-date">
          <Input
            id="activity-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="min-w-[10rem]"
          />
        </Field>
        <Field label="תקלה / ישות" htmlFor="activity-entity">
          <Input
            id="activity-entity"
            value={entity}
            onChange={(e) => setEntity(e.target.value)}
            placeholder="מספר תקלה…"
            className="min-w-[10rem]"
          />
        </Field>
      </div>

      <Panel flush elevated className="overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState
            title="אין אירועים"
            description={
              actionType || actor || date || entity
                ? 'נסו לשנות את הסינון.'
                : 'פעולות על תקלות יופיעו כאן כיומן מרכזי.'
            }
          />
        ) : (
          <div className="divide-y divide-border">
            {groups.map((g) => (
              <section key={g.key}>
                <h2 className="t-caption sticky top-0 z-[1] border-b border-border bg-surface-sunken/80 px-4 py-2 text-ink-3 backdrop-blur-sm">
                  {g.label}
                  <span className="t-num ms-2">{g.items.length}</span>
                </h2>
                <ul>
                  {g.items.map((e) => (
                    <li
                      key={e.id}
                      className="relative flex gap-3 px-4 py-3 ps-8 before:absolute before:start-[1.15rem] before:top-0 before:h-full before:w-px before:bg-border after:absolute after:start-[0.95rem] after:top-[1.15rem] after:h-2 after:w-2 after:rounded-full after:bg-[var(--signal-progress)] after:ring-2 after:ring-surface"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="t-body-strong text-ink">{phraseEvent(e)}</p>
                        <p className="t-meta mt-0.5 text-ink-2">
                          {e.ticket_display || e.ticket_id ? (
                            <Link
                              href={`/ops/tickets/${e.ticket_id}`}
                              className="text-[var(--tenant)] hover:underline"
                            >
                              {e.ticket_display || e.ticket_id.slice(0, 8)}
                            </Link>
                          ) : (
                            '—'
                          )}
                          <span className="text-ink-3">
                            {' · '}
                            {actorLabel(e.actor_id)}
                          </span>
                        </p>
                      </div>
                      <time
                        dateTime={e.created_at}
                        className="t-caption t-num shrink-0 text-ink-3"
                      >
                        {fmtTime(e.created_at)}
                      </time>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </Panel>
    </div>
  )
}
