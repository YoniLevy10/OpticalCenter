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
import {
  IL_REGION_CODES,
  IL_REGION_LABELS_HE,
  regionCodeFromId,
  regionLabelHe,
  type IlRegionCode,
} from '@/modules/stores/regions'

export const dynamic = 'force-dynamic'

export default async function StoresPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; region?: string }>
}) {
  const actor = await getServerActor()
  if (!actor && !shouldAllowDemoEntry()) {
    redirect('/login')
  }

  const sp = await searchParams
  const q = (sp.q ?? '').trim().toLowerCase()
  const regionFilter = (sp.region ?? '').trim().toUpperCase() as
    | IlRegionCode
    | ''
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

  const byRegion = new Map<IlRegionCode, number>()
  for (const code of IL_REGION_CODES) byRegion.set(code, 0)
  for (const s of stores) {
    if (s.is_active === false) continue
    const code = regionCodeFromId(s.region_id)
    if (code) byRegion.set(code, (byRegion.get(code) ?? 0) + 1)
  }
  const activeCount = stores.filter((s) => s.is_active !== false).length

  const filtered = stores.filter((s) => {
    if (regionFilter && regionCodeFromId(s.region_id) !== regionFilter) {
      return false
    }
    if (!q) return true
    const hay =
      `${s.code} ${s.name} ${s.city ?? ''} ${s.address ?? ''}`.toLowerCase()
    return hay.includes(q)
  })

  const canMutate =
    actor?.memberships.some(
      (m) => m.role === 'global_admin' || m.role === 'country_manager',
    ) || shouldAllowDemoEntry()

  function regionHref(code: IlRegionCode | '') {
    const params = new URLSearchParams()
    if (sp.q) params.set('q', sp.q)
    if (code) params.set('region', code)
    const qs = params.toString()
    return qs ? `/ops/stores?${qs}` : '/ops/stores'
  }

  return (
    <OpsAppShell>
      <div className="flex flex-col gap-4">
        <PageHeader
          className="hidden md:flex"
          title="חנויות"
          meta={<span className="t-num">{filtered.length}</span>}
          actions={canMutate ? <StoreCreateForm /> : undefined}
        />

        <Panel className="space-y-3">
          <p className="t-body-strong text-ink">
            פריסה ארצית · {activeCount} סניפים ב־6 מחוזות
          </p>
          <p className="t-meta text-ink-2">
            לכל חנות מיקום, תקלות, היסטוריה וסטטוס — הגיאוגרפיה לא מגבילה את
            המערכת.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              href={regionHref('')}
              className={cn(
                't-caption rounded-md border px-3 py-1.5',
                !regionFilter
                  ? 'border-ink bg-ink text-surface'
                  : 'border-border text-ink-2 hover:bg-surface-sunken/40',
              )}
            >
              הכל · {activeCount}
            </Link>
            {IL_REGION_CODES.map((code) => (
              <Link
                key={code}
                href={regionHref(code)}
                className={cn(
                  't-caption rounded-md border px-3 py-1.5',
                  regionFilter === code
                    ? 'border-ink bg-ink text-surface'
                    : 'border-border text-ink-2 hover:bg-surface-sunken/40',
                )}
              >
                {IL_REGION_LABELS_HE[code]} · {byRegion.get(code) ?? 0}
              </Link>
            ))}
          </div>
        </Panel>

        <StoreSearch initialQ={sp.q ?? ''} />

        <Panel flush elevated className="overflow-hidden">
          {filtered.length === 0 ? (
            <EmptyState
              title="לא נמצאו חנויות"
              description="נסו שם, מספר, עיר או מחוז."
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
                          {regionLabelHe(s.region_id)}
                          {s.city ? ` · ${s.city}` : ''}
                          {s.address ? ` · ${s.address}` : ''}
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
