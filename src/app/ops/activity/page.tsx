import Link from 'next/link'
import { redirect } from 'next/navigation'
import { format } from 'date-fns'
import { OpsAppShell } from '@/components/layout/ops-app-shell'
import {
  EmptyState,
  PageHeader,
  Panel,
} from '@/components/ui/primitives'
import { AdminRow, AdminRowList } from '@/components/ui/admin-row'
import { getServerActor } from '@/lib/auth/server-actor'
import { shouldAllowDemoEntry } from '@/lib/auth/home-path'
import { listRecentAuditEvents } from '@/modules/audit/service'

export const dynamic = 'force-dynamic'

const EVENT_HE: Record<string, string> = {
  created: 'נוצרה',
  assigned: 'שויכה',
  status_changed: 'שינוי סטטוס',
  sla_breached: 'הפרת SLA',
  partner_dispatched: 'שיגור לספק',
  note_added: 'הערה',
  photo_added: 'תמונה',
}

function fmt(iso: string) {
  try {
    return format(new Date(iso), 'dd/MM HH:mm')
  } catch {
    return iso
  }
}

export default async function ActivityPage() {
  const actor = await getServerActor()
  if (!actor && !shouldAllowDemoEntry()) redirect('/login')

  const { events, backend } = await listRecentAuditEvents(100)

  return (
    <OpsAppShell>
      <div className="space-y-4">
        <PageHeader
          className="hidden md:flex"
          title="יומן פעילות"
          meta={backend === 'memory' ? 'מצב דמו' : undefined}
        />

        <Panel flush elevated className="overflow-hidden">
          {events.length === 0 ? (
            <EmptyState
              title="אין אירועים עדיין"
              description="פעולות על תקלות יופיעו כאן כיומן מרכזי."
            />
          ) : (
            <>
              <AdminRowList>
                {events.map((e) => (
                  <AdminRow
                    key={e.id}
                    title={
                      <>
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
                      </>
                    }
                    subtitle={JSON.stringify(e.payload).slice(0, 80)}
                    trailing={
                      <time className="t-caption t-num shrink-0 text-ink-3">
                        {fmt(e.created_at)}
                      </time>
                    }
                  />
                ))}
              </AdminRowList>
              <ul className="hidden divide-y divide-border md:block">
              {events.map((e) => (
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
                      <p className="t-meta mt-0.5 truncate text-ink-3" dir="ltr">
                        {JSON.stringify(e.payload).slice(0, 120)}
                      </p>
                    </div>
                    <time className="t-caption t-num shrink-0 text-ink-3">
                      {fmt(e.created_at)}
                    </time>
                  </div>
                </li>
              ))}
            </ul>
            </>
          )}
        </Panel>
      </div>
    </OpsAppShell>
  )
}
