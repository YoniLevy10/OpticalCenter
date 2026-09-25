import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Store } from 'lucide-react'
import { OpsAppShell } from '@/components/layout/ops-app-shell'
import { Panel, EmptyState } from '@/components/ui/primitives'
import { Button } from '@/components/ui/button'
import { OpsPageHero } from '@/components/ops/ops-page-hero'
import { OperationalRow, RowList } from '@/components/ui/operational-row'
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

  const openStores = filtered.filter(
    (s) => (openCountByStore.get(s.id) ?? 0) > 0,
  ).length

  return (
    <OpsAppShell>
      <div className="flex flex-col gap-5 stagger">
        <OpsPageHero
          title="חנויות"
          status={`פריסה ארצית · ${activeCount} סניפים פעילים${
            openStores > 0 ? ` · ${openStores} עם תקלות פתוחות` : ''
          }`}
          actions={canMutate ? <StoreCreateForm /> : undefined}
        />

        <div
          role="group"
          aria-label="סינון לפי מחוז"
          className="flex flex-wrap gap-1.5 rounded-[var(--radius-md)] border border-border bg-surface-sunken/40 p-1.5"
        >
          <Link
            href={regionHref('')}
            className={cn(
              't-caption rounded-[var(--radius-sm)] px-3 py-2 transition-colors',
              !regionFilter
                ? 'bg-surface text-ink shadow-[var(--shadow-1)]'
                : 'text-ink-3 hover:text-ink',
            )}
          >
            הכל · {activeCount}
          </Link>
          {IL_REGION_CODES.map((code) => (
            <Link
              key={code}
              href={regionHref(code)}
              className={cn(
                't-caption rounded-[var(--radius-sm)] px-3 py-2 transition-colors',
                regionFilter === code
                  ? 'bg-surface text-ink shadow-[var(--shadow-1)]'
                  : 'text-ink-3 hover:text-ink',
              )}
            >
              {IL_REGION_LABELS_HE[code]} · {byRegion.get(code) ?? 0}
            </Link>
          ))}
        </div>

        <StoreSearch initialQ={sp.q ?? ''} />

        <Panel flush elevated className="overflow-hidden">
          {filtered.length === 0 ? (
            <EmptyState
              title="לא נמצאו חנויות"
              description="נסו שם, מספר, עיר או מחוז."
              icon={Store}
            />
          ) : (
            <RowList>
              {filtered.map((s) => {
                const openCount = openCountByStore.get(s.id) ?? 0
                return (
                  <OperationalRow
                    key={s.id}
                    href={`/ops/stores/${encodeURIComponent(s.code)}`}
                    priority={openCount > 0 ? 'high' : 'medium'}
                    leading={
                      <span className="t-num text-ink">#{s.code}</span>
                    }
                    trailing={
                      openCount > 0 ? (
                        <span className="t-caption t-num text-[var(--signal-critical)]">
                          {openCount} פתוחות
                        </span>
                      ) : (
                        <span className="t-caption text-ink-3">שקט</span>
                      )
                    }
                    title={s.name}
                    subtitle={
                      [regionLabelHe(s.region_id), s.city, s.address]
                        .filter(Boolean)
                        .join(' · ') || undefined
                    }
                    footer={
                      s.is_active === false ? (
                        <span className="t-meta text-ink-3">מושבת</span>
                      ) : undefined
                    }
                  />
                )
              })}
            </RowList>
          )}
        </Panel>

        <Button asChild variant="ghost" size="touch" className="self-start">
          <Link href="/ops/stores/print-qr">הדפסת QR</Link>
        </Button>
      </div>
    </OpsAppShell>
  )
}
