import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Store } from 'lucide-react'
import { OpsAppShell } from '@/components/layout/ops-app-shell'
import { EmptyState } from '@/components/ui/primitives'
import { OpsPageHero } from '@/components/ops/ops-page-hero'
import { Button } from '@/components/ui/button'
import { StoreSearch } from './store-search'
import { StoreCreateForm } from './store-create-form'
import { StoreQrAccordion } from './store-qr-accordion'
import { StoreBoard, type StoreGroupModel } from './store-board'
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

  function toCard(s: (typeof filtered)[number]) {
    const openCount = openCountByStore.get(s.id) ?? 0
    const inactive = s.is_active === false
    return {
      id: s.id,
      code: s.code,
      name: s.name,
      city: s.city,
      inactive,
      openCount,
      status: inactive
        ? p('מושבת')
        : openCount > 0
          ? `${openCount} ${openCount === 1 ? p('פתוחה') : p('פתוחות')}`
          : p('שקט'),
    }
  }

  const groups: StoreGroupModel[] = IL_REGION_CODES.flatMap((code) => {
    const rows = filtered.filter((s) => regionCodeFromId(s.region_id) === code)
    if (rows.length === 0) return []
    return [{ code, label: regionLabel(code, locale), stores: rows.map(toCard) }]
  })
  const ungrouped = filtered.filter((s) => !regionCodeFromId(s.region_id))
  if (ungrouped.length > 0) {
    groups.push({ code: 'other', label: p('בלי מחוז'), stores: ungrouped.map(toCard) })
  }

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

        <div
          role="group"
          aria-label="סינון לפי מחוז"
          className="flex gap-2 overflow-x-auto pb-1 scrollbar-none"
        >
          <Link
            href={regionHref('')}
            className={cn(
              't-body inline-flex min-h-[var(--tap)] shrink-0 items-center rounded-full px-4',
              !regionFilter
                ? 'bg-ink text-[var(--tenant-contrast)]'
                : 'bg-surface text-ink-2',
            )}
          >
            הכל · {activeCount}
          </Link>
          {IL_REGION_CODES.map((code) => (
            <Link
              key={code}
              href={regionHref(code)}
              className={cn(
                't-body inline-flex min-h-[var(--tap)] shrink-0 items-center rounded-full px-4',
                regionFilter === code
                  ? 'bg-ink text-[var(--tenant-contrast)]'
                  : 'bg-surface text-ink-2',
              )}
            >
              {regionLabel(code, locale)} · {byRegion.get(code) ?? 0}
            </Link>
          ))}
        </div>

        <StoreSearch initialQ={sp.q ?? ''} region={regionFilter} />

        {groups.length === 0 ? (
          <EmptyState
            title="לא נמצאו חנויות"
            description="נסו שם, מספר, עיר או מחוז."
            icon={Store}
          />
        ) : (
          <StoreBoard groups={groups} />
        )}

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
