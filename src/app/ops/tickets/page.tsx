import Link from 'next/link'
import { OpsShell } from '@/components/layout/ops-shell'
import { PriorityDot, StatusBadge, SlaChip } from '@/components/ui/badges'
import { SeedDemoTicketButton } from '@/components/ops/seed-demo-ticket-button'
import { IssuesMobileList } from '@/components/ops/issues-mobile-list'
import { IssuesFilterBar } from '@/components/ops/issues-filter-bar'
import { EmptyState, SurfaceTable } from '@/components/ui/primitives'
import { Input } from '@/components/ui/input'
import { listTickets } from '@/modules/tickets/service'
import {
  OPEN_TICKET_STATUSES,
  type TicketPriority,
  type TicketStatus,
} from '@/modules/tickets/constants'
import { formatSlaLabelHe, isSlaBreached } from '@/modules/tickets/sla'
import { formatDistanceToNow } from 'date-fns'
import { he } from 'date-fns/locale'

export const dynamic = 'force-dynamic'

function ageLabel(iso: string) {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: he })
  } catch {
    return '—'
  }
}

export default async function TicketsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; priority?: string; q?: string }>
}) {
  const sp = await searchParams
  const { tickets, backend } = await listTickets()
  const statusFilter = (sp.status || 'open').trim()
  const priorityFilter = (sp.priority || '').trim()
  const q = (sp.q || '').trim().toLowerCase()

  const filtered = tickets.filter((t) => {
    if (statusFilter === 'open') {
      if (
        !OPEN_TICKET_STATUSES.includes(
          t.status as (typeof OPEN_TICKET_STATUSES)[number],
        )
      )
        return false
    } else if (statusFilter === 'critical') {
      if (t.priority !== 'critical' && t.priority !== 'high') return false
    } else if (statusFilter && t.status !== statusFilter) return false
    if (priorityFilter && t.priority !== priorityFilter) return false
    if (q) {
      const hay =
        `${t.display_number ?? ''} ${t.description} ${t.stores?.name ?? ''} ${t.stores?.code ?? ''}`.toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  })

  const rows = filtered.map((t) => ({
    ...t,
    sla_respond_by: (t as { sla_respond_by?: string }).sla_respond_by,
    sla_resolve_by: (t as { sla_resolve_by?: string }).sla_resolve_by,
  }))

  return (
    <OpsShell
      pathname="/ops/tickets"
      title="תקלות"
      subtitle={backend === 'supabase' ? 'תיבת תפעול' : 'תיבת תפעול · דמו'}
      actions={<SeedDemoTicketButton />}
    >
      <IssuesFilterBar statusFilter={statusFilter} q={sp.q} />

      <form className="mb-4 flex gap-2">
        <input type="hidden" name="status" value={statusFilter} />
        <Input
          name="q"
          defaultValue={sp.q ?? ''}
          placeholder="חיפוש: OC / חנות / תיאור"
          className="max-w-sm"
        />
        <button
          type="submit"
          className="min-h-[var(--touch-min)] rounded-[var(--radius-md)] border border-border bg-surface px-3 text-[13px] hover:bg-canvas md:h-9 md:min-h-0"
        >
          חפש
        </button>
      </form>

      {filtered.length === 0 ? (
        <EmptyState
          title="אין תקלות לפי הסינון"
          description="נסו לשנות סגמנט או ליצור תקלת הדגמה."
          action={<SeedDemoTicketButton />}
        />
      ) : (
        <>
          <IssuesMobileList tickets={rows} />

          <div className="hidden md:block">
            <SurfaceTable>
              <thead>
                <tr className="border-b border-border bg-canvas/70 text-start text-[11px] font-medium text-muted">
                  <th className="px-3 py-2">עדיפות</th>
                  <th className="px-3 py-2">מס׳</th>
                  <th className="px-3 py-2">חנות</th>
                  <th className="px-3 py-2">תקלה</th>
                  <th className="px-3 py-2">סטטוס</th>
                  <th className="px-3 py-2">גיל</th>
                  <th className="px-3 py-2">SLA</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((t) => {
                  const breached = isSlaBreached({
                    status: t.status,
                    sla_respond_by: t.sla_respond_by,
                    sla_resolve_by: t.sla_resolve_by,
                  })
                  return (
                    <tr
                      key={t.id}
                      className="border-b border-border/80 transition-colors hover:bg-canvas/80"
                      style={{ height: 'var(--row-h)' }}
                    >
                      <td className="px-3">
                        <PriorityDot priority={t.priority as TicketPriority} />
                      </td>
                      <td className="px-3 font-medium tabular-nums">
                        <Link
                          href={`/ops/tickets/${t.id}`}
                          className="hover:text-accent"
                        >
                          {t.display_number ??
                            (t.number != null ? `OC-${t.number}` : '—')}
                        </Link>
                      </td>
                      <td className="px-3">
                        <div className="font-medium">{t.stores?.name ?? '—'}</div>
                        <div className="text-[11px] text-faint">
                          {t.stores?.code ? `#${t.stores.code}` : ''}
                        </div>
                      </td>
                      <td className="max-w-[280px] truncate px-3 text-muted">
                        <Link href={`/ops/tickets/${t.id}`}>{t.description}</Link>
                      </td>
                      <td className="px-3">
                        <StatusBadge status={t.status as TicketStatus} />
                      </td>
                      <td className="px-3 text-[12px] text-muted">
                        {ageLabel(t.created_at)}
                      </td>
                      <td className="px-3">
                        <SlaChip
                          breached={breached}
                          label={formatSlaLabelHe({
                            priority: t.priority,
                            status: t.status,
                            sla_respond_by: t.sla_respond_by,
                            sla_resolve_by: t.sla_resolve_by,
                          })}
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </SurfaceTable>
          </div>
        </>
      )}
    </OpsShell>
  )
}
