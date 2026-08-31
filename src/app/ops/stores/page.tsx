import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Store } from 'lucide-react'
import { OpsAppShell } from '@/components/layout/ops-app-shell'
import { PageHeader, Panel, EmptyState } from '@/components/ui/primitives'
import { Button } from '@/components/ui/button'
import { StoreSearch } from './store-search'
import { StoreCreateForm } from './store-create-form'
import { fetchStores } from '@/modules/stores/data'
import { listTickets } from '@/modules/tickets/service'
import { getServerActor } from '@/lib/auth/server-actor'
import { shouldAllowDemoEntry } from '@/lib/auth/home-path'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function StoresPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const actor = await getServerActor()
  if (!actor && !shouldAllowDemoEntry()) {
    redirect('/login')
  }

  const sp = await searchParams
  const q = (sp.q ?? '').trim().toLowerCase()
  const { stores } = await fetchStores({ includeInactive: true })

  const { tickets } = await listTickets(500).catch(() => ({
    tickets: [],
    backend: 'memory' as const,
  }))

  const openCountByStore = new Map<string, number>()
  for (const t of tickets) {
    if (t.source === 'demo') continue
    if (
      t.status === 'closed' ||
      t.status === 'cancelled' ||
      t.status === 'resolved'
    ) {
      continue
    }
    openCountByStore.set(t.store_id, (openCountByStore.get(t.store_id) ?? 0) + 1)
  }

  const filtered = stores.filter((s) => {
    if (!q) return true
    const hay = `${s.code} ${s.name} ${s.city ?? ''} ${s.address ?? ''}`.toLowerCase()
    return hay.includes(q)
  })

  const canMutate =
    actor?.memberships.some(
      (m) => m.role === 'global_admin' || m.role === 'country_manager',
    ) || shouldAllowDemoEntry()

  return (
    <OpsAppShell>
      <div className="flex flex-col gap-4">
        <PageHeader
          className="hidden md:flex"
          title="חנויות"
          meta={<span className="t-num">{filtered.length}</span>}
          actions={canMutate ? <StoreCreateForm /> : undefined}
        />

        <StoreSearch initialQ={sp.q ?? ''} />

        <Panel flush elevated className="overflow-hidden">
          {filtered.length === 0 ? (
            <EmptyState
              title="לא נמצאו חנויות"
              description="נסו שם, מספר או עיר."
              icon={Store}
            />
          ) : (
            <ul className="divide-y divide-border">
              {filtered.map((s) => {
                const openCount = openCountByStore.get(s.id) ?? 0
                return (
                  <li key={s.id}>
                    <Link
                      href={`/ops/stores/${encodeURIComponent(s.code)}`}
                      className="flex min-h-[var(--tap)] items-center gap-3 px-4 py-3.5 transition-colors hover:bg-surface-sunken/40"
                    >
                      <span className="t-body-strong t-num w-12 shrink-0 text-ink">
                        #{s.code}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="t-body-strong block truncate text-ink">
                          {s.name}
                        </span>
                        <span className="t-meta mt-0.5 block truncate text-ink-2">
                          {s.city || s.address || '—'}
                        </span>
                      </span>
                      {openCount > 0 ? (
                        <span
                          className={cn(
                            't-caption t-num shrink-0 text-[var(--signal-critical)]',
                          )}
                        >
                          {openCount} פתוחות
                        </span>
                      ) : null}
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </Panel>

        <Button asChild variant="ghost" size="touch" className="self-start">
          <Link href="/ops/stores/print-qr">הדפסת QR</Link>
        </Button>
      </div>
    </OpsAppShell>
  )
}
