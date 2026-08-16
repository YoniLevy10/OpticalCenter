import Link from 'next/link'
import { AppShell } from '@/components/layout/app-shell'
import { PageHeader, EmptyState, Panel, ErrorState } from '@/components/ui/primitives'
import { Button } from '@/components/ui/button'
import {
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
  RowLink,
} from '@/components/ui/table'
import { OperationalRow, RowList, Dot } from '@/components/ui/operational-row'
import { LiveAge, LiveSla } from '@/components/ui/time'
import { StatusLabel, priorityEdgeClass, priorityRowClass } from '@/components/ui/signal'
import { AttentionStrip, QueueToolbar } from './queue-toolbar'
import { listTickets, listInternalTechnicians } from '@/modules/tickets/service'
import { fetchStores } from '@/modules/stores/data'
import {
  applyQueue,
  parseQueueParams,
  queueCounts,
  queueHref,
  viewCounts,
  type QueueTicket,
} from '@/modules/tickets/queue'
import { QUEUE_SORTS } from '@/modules/tickets/queue'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 50

function ticketNumber(t: QueueTicket): string {
  return t.display_number ?? (t.number != null ? `OC-${t.number}` : '—')
}

function technicianName(
  id: string | null | undefined,
  techs: { id: string; name: string }[],
): string {
  if (!id) return '—'
  return techs.find((t) => t.id === id)?.name ?? `${id.slice(0, 6)}…`
}

export default async function TicketsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const sp = await searchParams
  const filters = parseQueueParams(sp)
  const page = Math.max(1, Number(sp.page ?? '1') || 1)

  const [ticketResult, storeResult, techRows] = await Promise.all([
    listTickets(500).catch(() => ({ tickets: [], backend: 'memory' as const })),
    fetchStores().catch(() => ({ stores: [], fromDb: false })),
    listInternalTechnicians().catch(() => []),
  ])

  const all = (ticketResult.tickets ?? []) as unknown as QueueTicket[]
  const technicians = techRows.map((t) => ({
    id: t.id,
    name: t.full_name || t.email || t.id.slice(0, 8),
  }))

  const filtered = applyQueue(all, filters)
  const counts = queueCounts(all)
  const views = viewCounts(all)

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const current = Math.min(page, totalPages)
  const rows = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE)

  const sortHref = (key: (typeof QUEUE_SORTS)[number]['key']) =>
    queueHref(filters, { sort: key })

  return (
    <AppShell>
      <div className="space-y-4">
        <PageHeader
          title="תקלות"
          meta={ticketResult.backend === 'supabase' ? undefined : 'מצב דמו'}
          actions={
            <Button asChild variant="secondary" size="sm">
              <Link href="/ops/simulator">דיווח לבדיקה</Link>
            </Button>
          }
        />

        <AttentionStrip counts={counts} filters={filters} />

        <QueueToolbar
          filters={filters}
          viewCounts={views}
          stores={storeResult.stores.map((s) => ({ code: s.code, name: s.name }))}
          technicians={technicians}
          resultCount={filtered.length}
        />

        {all.length === 0 && ticketResult.backend !== 'supabase' ? (
          <ErrorState
            title="אין חיבור לנתונים"
            description="המערכת פועלת במצב זיכרון. אפשר ליצור דיווח בדיקה דרך הסימולטור."
            action={
              <Button asChild variant="secondary" size="sm">
                <Link href="/ops/simulator">פתיחת סימולטור</Link>
              </Button>
            }
          />
        ) : null}

        <Panel flush className="overflow-hidden">
          {rows.length === 0 ? (
            <EmptyState
              title="אין תקלות בתצוגה הזו"
              description={
                filters.q
                  ? `לא נמצאו תוצאות עבור «${filters.q}».`
                  : 'כשמגיעים דיווחים מהחנויות הם יופיעו כאן.'
              }
              action={
                <Button asChild variant="secondary" size="sm">
                  <Link href={queueHref({ view: 'all', sort: 'newest' })}>
                    הצגת כל התקלות
                  </Link>
                </Button>
              }
            />
          ) : (
            <>
              {/* ---------- Desktop: dense table ---------- */}
              <div className="hidden md:block">
                <Table>
                  <THead>
                    <TH className="w-[112px]">מס׳</TH>
                    <TH className="w-[220px]">חנות</TH>
                    <TH>תקלה</TH>
                    <TH className="w-[132px]">סטטוס</TH>
                    <TH className="w-[136px]">טכנאי</TH>
                    <TH
                      className="w-[104px]"
                      sort={{
                        href: sortHref('oldest'),
                        active: filters.sort === 'oldest' || filters.sort === 'newest',
                        direction: filters.sort === 'newest' ? 'desc' : 'asc',
                      }}
                    >
                      גיל
                    </TH>
                    <TH
                      className="w-[112px]"
                      align="end"
                      sort={{
                        href: sortHref('sla'),
                        active: filters.sort === 'sla',
                        direction: 'asc',
                      }}
                    >
                      SLA
                    </TH>
                  </THead>
                  <TBody>
                    {rows.map((t) => (
                      <TR
                        key={t.id}
                        edgeClass={priorityEdgeClass(t.priority)}
                        className={priorityRowClass(t.priority)}
                      >
                        <TD className="relative ps-4">
                          <RowLink
                            href={`/ops/tickets/${t.id}`}
                            label={`תקלה ${ticketNumber(t)}`}
                          >
                            <span className="t-body-strong t-num text-ink">
                              {ticketNumber(t)}
                            </span>
                          </RowLink>
                        </TD>
                        <TD>
                          <span className="t-body block truncate text-ink">
                            {t.stores?.name ?? '—'}
                          </span>
                          {t.stores?.code ? (
                            <span className="t-caption t-num text-ink-3">
                              #{t.stores.code}
                            </span>
                          ) : null}
                        </TD>
                        <TD>
                          <span className="t-body block max-w-[46ch] truncate text-ink-2">
                            {t.title || t.description}
                          </span>
                        </TD>
                        <TD>
                          <StatusLabel status={t.status} />
                        </TD>
                        <TD>
                          <span className="t-body block truncate text-ink-2">
                            {technicianName(t.assigned_to, technicians)}
                          </span>
                        </TD>
                        <TD>
                          <LiveAge createdAt={t.created_at} />
                        </TD>
                        <TD align="end">
                          <LiveSla ticket={t} />
                        </TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </div>

              {/* ---------- Mobile: operational list ---------- */}
              <div className="md:hidden">
                <RowList>
                  {rows.map((t) => (
                    <OperationalRow
                      key={t.id}
                      href={`/ops/tickets/${t.id}`}
                      priority={t.priority}
                      leading={ticketNumber(t)}
                      trailing={<LiveSla ticket={t} />}
                      title={t.title || t.description}
                      subtitle={
                        t.stores
                          ? `${t.stores.name}${t.stores.code ? ` · #${t.stores.code}` : ''}`
                          : undefined
                      }
                      footer={
                        <>
                          <StatusLabel status={t.status} />
                          <Dot />
                          <span className="t-meta truncate text-ink-2">
                            {technicianName(t.assigned_to, technicians)}
                          </span>
                          <Dot />
                          <LiveAge createdAt={t.created_at} />
                        </>
                      }
                    />
                  ))}
                </RowList>
              </div>
            </>
          )}
        </Panel>

        {totalPages > 1 ? (
          <nav className="flex items-center justify-between gap-3">
            <p className="t-meta t-num text-ink-3">
              עמוד {current} מתוך {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                asChild
                variant="secondary"
                size="sm"
                className={current <= 1 ? 'pointer-events-none opacity-40' : ''}
              >
                <Link
                  href={`${queueHref(filters)}${queueHref(filters).includes('?') ? '&' : '?'}page=${current - 1}`}
                >
                  הקודם
                </Link>
              </Button>
              <Button
                asChild
                variant="secondary"
                size="sm"
                className={
                  current >= totalPages ? 'pointer-events-none opacity-40' : ''
                }
              >
                <Link
                  href={`${queueHref(filters)}${queueHref(filters).includes('?') ? '&' : '?'}page=${current + 1}`}
                >
                  הבא
                </Link>
              </Button>
            </div>
          </nav>
        ) : null}
      </div>
    </AppShell>
  )
}
