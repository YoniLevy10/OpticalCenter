import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getServerActor } from '@/lib/auth/server-actor'
import { primaryStoreId, shouldAllowDemoEntry } from '@/lib/auth/home-path'
import { scopeTicketsForActor } from '@/lib/auth/ticket-scope'
import { listTickets } from '@/modules/tickets/service'
import { fetchStores } from '@/modules/stores/data'
import { StatusLabel } from '@/components/ui/signal'
import { EmptyState, Panel } from '@/components/ui/primitives'
import { Button } from '@/components/ui/button'
import { OpsPageHero } from '@/components/ops/ops-page-hero'
import { OperationalRow, RowList, Dot } from '@/components/ui/operational-row'
import type { QueueTicket } from '@/modules/tickets/queue'

export const dynamic = 'force-dynamic'

export default async function StoreHomePage() {
  const actor = await getServerActor()
  if (!actor && !shouldAllowDemoEntry()) redirect('/login')

  const storeId = actor ? primaryStoreId(actor) : null
  const { stores } = await fetchStores()
  const store = storeId
    ? stores.find((s) => s.id === storeId)
    : stores.find((s) => s.code === '172') ?? stores[0]

  const result = await listTickets({ limit: 200 }).catch(() => ({
    tickets: [] as QueueTicket[],
  }))
  const scoped = actor
    ? scopeTicketsForActor(actor, result.tickets as unknown as QueueTicket[])
    : (result.tickets as unknown as QueueTicket[])

  const mine = store
    ? scoped.filter((t) => t.stores?.code === store.code)
    : scoped

  return (
    <div className="flex flex-col gap-5 stagger">
      <OpsPageHero
        eyebrow={
          store ? `חנות #${store.code}` : 'Optical Center · חנות'
        }
        title="התקלות שלי"
        status={
          mine.length === 0
            ? 'אין דיווחים פתוחים כרגע'
            : `${mine.length} דיווחים מהחנות`
        }
      />

      <Button asChild variant="primary" size="block">
        <Link href="/store/report">דיווח תקלה חדשה</Link>
      </Button>

      <Panel flush elevated className="overflow-hidden">
        {mine.length === 0 ? (
          <EmptyState
            title="אין תקלות"
            description="כשתדווחו על תקלה היא תופיע כאן."
            className="py-12"
          />
        ) : (
          <RowList>
            {mine.slice(0, 30).map((t) => (
              <OperationalRow
                key={t.id}
                href={`/store/tickets/${t.id}`}
                priority={t.priority}
                leading={
                  <span className="t-num text-ink">
                    {t.display_number ?? t.id.slice(0, 8)}
                  </span>
                }
                title={t.title || t.description}
                footer={
                  <>
                    <StatusLabel status={t.status} />
                    {t.status === 'resolved' ? (
                      <>
                        <Dot />
                        <span className="t-meta text-[var(--signal-warning)]">
                          נדרש אישור
                        </span>
                      </>
                    ) : null}
                  </>
                }
              />
            ))}
          </RowList>
        )}
      </Panel>
    </div>
  )
}
