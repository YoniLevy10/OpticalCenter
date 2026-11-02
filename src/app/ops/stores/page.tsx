import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Store } from 'lucide-react'
import { OpsAppShell } from '@/components/layout/ops-app-shell'
import { Panel, EmptyState } from '@/components/ui/primitives'
import { OpsPageHero } from '@/components/ops/ops-page-hero'
import { Button } from '@/components/ui/button'
import { OperationalRow, RowList } from '@/components/ui/operational-row'
import { StoreSearch } from './store-search'
import { StoreCreateForm } from './store-create-form'
import { StoreQrAccordion } from './store-qr-accordion'
import { StoresMobileList } from './stores-mobile-list'
import { PhoneFold } from '@/components/layout/phone-fold'
import { fetchStores } from '@/modules/stores/data'
import { resolveWhatsAppBusinessPhone } from '@/modules/stores/business-phone'
import { storeWhatsAppDeepLink } from '@/modules/stores/whatsapp-link'
import { listTickets } from '@/modules/tickets/service'
import { getServerActor } from '@/lib/auth/server-actor'
import { shouldAllowDemoEntry } from '@/lib/auth/home-path'
import { getLocale } from '@/lib/i18n/server'
import { phrase } from '@/lib/i18n/phrases'
import { cn } from '@/lib/utils'
import {
  IL_REGION_CODES,
  regionCodeFromId,
  regionLabel,
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
  const [{ stores }, businessPhone] = await Promise.all([
    fetchStores({ includeInactive: true }),
    resolveWhatsAppBusinessPhone(),
  ])

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

  const filtered = stores
    .filter((s) => {
      if (regionFilter && regionCodeFromId(s.region_id) !== regionFilter) {
        return false
      }
      if (!q) return true
      const hay =
        `${s.code} ${s.name} ${s.city ?? ''} ${s.address ?? ''} ${s.manager_name ?? ''} ${s.manager_phone ?? ''} ${s.area_manager ?? ''}`.toLowerCase()
      return hay.includes(q)
    })
    .sort((a, b) => {
      const openDelta =
        (openCountByStore.get(b.id) ?? 0) - (openCountByStore.get(a.id) ?? 0)
      if (openDelta !== 0) return openDelta
      return a.name.localeCompare(b.name, 'he')
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

  const locale = await getLocale()
  const p = (text: string) => phrase(locale, text)
  const openStores = filtered.filter(
    (s) => (openCountByStore.get(s.id) ?? 0) > 0,
  ).length

  return (
    <OpsAppShell>
      <div className="ari-home flex flex-col gap-5">
        <OpsPageHero
          largeTitle
          title="חנויות"
          status={`${activeCount} ${p('סניפים פעילים')}${
            openStores > 0 ? ` · ${openStores} ${p('עם תקלות פתוחות')}` : ''
          }`}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="secondary" size="sm" asChild>
                <Link href="/api/stores/qr-batch?format=pdf" target="_blank" rel="noopener">
                  הדפסת QR לכל הרשת
                </Link>
              </Button>
              {canMutate ? <StoreCreateForm /> : null}
            </div>
          }
        />

        <PhoneFold
          title={p('מחוז')}
          summary={
            regionFilter
              ? `${regionLabel(regionFilter, locale)} · ${byRegion.get(regionFilter) ?? 0}`
              : `${p('הכל')} · ${activeCount}`
          }
        >
        <div
          role="group"
          aria-label="סינון לפי מחוז"
          className="flex flex-wrap gap-1.5"
        >
          <Link
            href={regionHref('')}
            className={cn(
              't-caption inline-flex min-h-[var(--tap)] items-center rounded-[var(--radius-sm)] px-3.5 py-2 transition-colors',
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
                't-caption inline-flex min-h-[var(--tap)] items-center rounded-[var(--radius-sm)] px-3.5 py-2 transition-colors',
                regionFilter === code
                  ? 'bg-surface text-ink shadow-[var(--shadow-1)]'
                  : 'text-ink-3 hover:text-ink',
              )}
            >
              {regionLabel(code, locale)} · {byRegion.get(code) ?? 0}
            </Link>
          ))}
        </div>
        </PhoneFold>

        <StoreSearch initialQ={sp.q ?? ''} />

        {filtered.length === 0 ? (
          <div className="md:hidden">
            <EmptyState
              title="לא נמצאו חנויות"
              description="נסו שם, מספר, עיר או מחוז."
              icon={Store}
            />
          </div>
        ) : (
          <StoresMobileList
            stores={filtered.map((s) => ({
              id: s.id,
              code: s.code,
              name: s.name,
              city: s.city,
              address: s.address,
              is_active: s.is_active,
              openCount: openCountByStore.get(s.id) ?? 0,
              waHref: businessPhone
                ? storeWhatsAppDeepLink(s.code, businessPhone)
                : null,
            }))}
          />
        )}

        <Panel flush elevated className="hidden overflow-hidden md:block">
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
                        <span className="t-caption t-num text-ink">
                          {openCount} פתוחות
                        </span>
                      ) : (
                        <span className="t-caption text-ink-3">שקט</span>
                      )
                    }
                    title={s.name}
                    subtitle={
                      [
                        regionLabel(s.region_id, locale),
                        s.city,
                        s.manager_name,
                        s.manager_phone,
                      ]
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

        <div className="hidden md:block">
        <StoreQrAccordion
          stores={filtered
            .filter((s) => s.is_active !== false)
            .map((s) => ({
              id: s.id,
              code: s.code,
              name: s.name,
              deepLink: businessPhone
                ? storeWhatsAppDeepLink(s.code, businessPhone)
                : null,
            }))}
        />
        </div>
      </div>
    </OpsAppShell>
  )
}
