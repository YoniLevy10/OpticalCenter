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
    <div className="space-y-4">
      <div>
        <h1 className="t-title text-ink">התקלות שלי</h1>
        <p className="t-body mt-1 text-ink-2">
          דיווחים מהחנות {store ? `#${store.code} ${store.name}` : ''}
        </p>
      </div>

      <Button asChild variant="primary" size="block">
        <Link href="/store/report">דיווח תקלה חדשה</Link>
      </Button>

      <Panel flush elevated>
        {mine.length === 0 ? (
          <EmptyState
            title="אין תקלות"
            description="כשתדווחו על תקלה היא תופיע כאן."
          />
        ) : (
          <ul className="divide-y divide-border">
            {mine.slice(0, 30).map((t) => (
              <li key={t.id} className="px-4 py-3">
                <p className="t-body-strong t-num text-ink">
                  {t.display_number ?? t.id.slice(0, 8)}
                </p>
                <p className="t-body mt-0.5 line-clamp-2 text-ink-2">
                  {t.title || t.description}
                </p>
                <div className="mt-2">
                  <StatusLabel status={t.status} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  )
}
