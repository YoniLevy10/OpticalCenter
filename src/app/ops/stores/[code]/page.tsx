import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { OpsAppShell } from '@/components/layout/ops-app-shell'
import { PageToolbar } from '@/components/layout/page-toolbar'
import {
  Panel,
  KeyValue,
  EmptyState,
} from '@/components/ui/primitives'
import { Button } from '@/components/ui/button'
import { OpsPageHero } from '@/components/ops/ops-page-hero'
import { StatusLabel } from '@/components/ui/signal'
import { getServerActor } from '@/lib/auth/server-actor'
import { shouldAllowDemoEntry } from '@/lib/auth/home-path'
import { getStoreByCode } from '@/modules/stores/service'
import { storeWhatsAppDeepLink } from '@/modules/stores/whatsapp-link'
import { resolveWhatsAppBusinessPhone } from '@/modules/stores/business-phone'
import { listTickets } from '@/modules/tickets/service'
import { OPEN_TICKET_STATUSES } from '@/modules/tickets/constants'
import { StoreQrPanel } from '../store-qr-panel'
import { StoreEditControls } from '../store-edit-controls'
import { StoreDirectoryPanel } from '../store-directory-panel'
import { StoreAssetsPanel } from './store-assets-panel'
import { StoreSecondaryActions } from './store-secondary-actions'
import { StoreVisitDispatch } from './store-visit-dispatch'
import { areaManagerForStore, listAudits, listContactsForStore } from '@/lib/data/ops-ledger'
import { regionLabel } from '@/modules/stores/regions'
import { getLocale } from '@/lib/i18n/server'
import { phrase } from '@/lib/i18n/phrases'
import { listVendors } from '@/modules/vendors/service'

export const dynamic = 'force-dynamic'

function displayNum(t: {
  display_number?: string | null
  number?: number | null
  id: string
}) {
  if (t.display_number?.trim()) return t.display_number
  if (t.number != null) return `OC-${t.number}`
  return t.id.slice(0, 8)
}

export default async function StoreDetailPage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const locale = await getLocale()
  const p = (text: string) => phrase(locale, text)
  const actor = await getServerActor()
  if (!actor && !shouldAllowDemoEntry()) {
    redirect('/login')
  }

  const { code: raw } = await params
  const code = decodeURIComponent(raw).trim()

  const { store } = await getStoreByCode(code)
  if (!store) notFound()

  const businessPhone = await resolveWhatsAppBusinessPhone()
  const deepLink = businessPhone
    ? storeWhatsAppDeepLink(store.code, businessPhone)
    : null
  const canEdit =
    Boolean(
      actor?.memberships.some(
        (m) => m.role === 'global_admin' || m.role === 'country_manager',
      ),
    ) || shouldAllowDemoEntry()
  const canDispatch = Boolean(
    actor?.memberships.some((m) =>
      ['global_admin', 'global_maintenance', 'country_manager'].includes(m.role),
    ),
  )

  const [{ tickets }, vendorsResult] = await Promise.all([
    listTickets({
      storeCode: store.code,
      statuses: [...OPEN_TICKET_STATUSES],
      limit: 40,
    }).catch(() => ({
      tickets: [],
      backend: 'memory' as const,
    })),
    listVendors({ activeOnly: true }).catch(() => ({
      vendors: [],
      backend: 'memory' as const,
    })),
  ])

  const openTickets = tickets.filter((t) => t.store_id === store.id)
  const openCount = openTickets.length
  const recent = openTickets.slice(0, 12)

  return (
    <OpsAppShell>
      <div className="mx-auto flex max-w-xl flex-col gap-5 stagger">
        <PageToolbar
          backHref="/ops/stores"
          backLabel="חזרה לחנויות"
          showRefresh
          actions={
            <StoreSecondaryActions
              code={store.code}
              storeId={store.id}
              isActive={store.is_active !== false}
              canEdit={canEdit}
              waLink={deepLink}
            />
          }
        />

        <OpsPageHero
          eyebrow={`#${store.code} · ${regionLabel(store.region_id, locale)}`}
          title={store.name}
          status={
            openCount > 0
              ? `${openCount} ${p('תקלות פתוחות בחנות זו')}`
              : store.is_active === false
                ? p('חנות מושבתת')
                : p('אין תקלות פתוחות')
          }
        />

        <Panel elevated>
          <dl className="divide-y divide-border">
            <KeyValue label="כתובת">{store.address ?? '—'}</KeyValue>
            <KeyValue label="עיר">{store.city ?? '—'}</KeyValue>
            <KeyValue label="מנהל/ת">
              {store.manager_name
                ? `${store.manager_name}${store.manager_name_en ? ` · ${store.manager_name_en}` : ''}`
                : '—'}
            </KeyValue>
            <KeyValue label="טלפון">{store.manager_phone ?? '—'}</KeyValue>
            <KeyValue label="מנהל אזור">{store.area_manager ?? '—'}</KeyValue>
            <KeyValue label="סטטוס">
              {store.is_active === false ? 'מושבת' : 'פעיל'}
            </KeyValue>
          </dl>
        </Panel>

        <Panel elevated className="overflow-hidden">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="t-section text-ink">תקלות פתוחות</p>
            <Button asChild variant="ghost" size="sm">
              <Link
                href={`/ops/tickets?view=open&store=${encodeURIComponent(store.code)}`}
              >
                לתור המלא
              </Link>
            </Button>
          </div>
          {recent.length === 0 ? (
            <EmptyState title="אין תקלות פתוחות בחנות זו" />
          ) : (
            <ul className="divide-y divide-border">
              {recent.map((t) => (
                <li key={t.id}>
                  <Link
                    href={`/ops/tickets/${t.id}`}
                    className="flex flex-col gap-1 px-1 py-3 transition-colors hover:bg-surface-sunken/40"
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="t-caption t-num font-semibold text-ink">
                        {displayNum(t)}
                      </span>
                      <StatusLabel status={t.status} />
                    </div>
                    <p className="t-body line-clamp-2 text-ink">
                      {t.title || t.description}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {canDispatch && recent.length > 0 ? (
          <StoreVisitDispatch
            storeId={store.id}
            storeCode={store.code}
            tickets={recent.map((t) => ({
              id: t.id,
              label: displayNum(t),
              title: t.title || t.description,
            }))}
            vendors={(vendorsResult.vendors ?? []).map((v) => ({
              id: v.id,
              name: v.name,
            }))}
          />
        ) : null}

        <Panel elevated className="overflow-hidden" id="store-qr">
          <p className="t-section mb-3 text-ink">הורדת QR</p>
          <StoreQrPanel code={store.code} deepLink={deepLink} />
        </Panel>

        <StoreAssetsPanel storeId={store.id} storeCode={store.code} />

        <Panel elevated>
          <p className="t-section mb-3 text-ink">סניף ואנשי קשר</p>
          <StoreDirectoryPanel
            storeId={store.id}
            code={store.code}
            canEdit={
              Boolean(actor?.memberships.some((m) => m.role === 'global_admin')) ||
              shouldAllowDemoEntry()
            }
            contacts={listContactsForStore(store.id, store.code)}
            areaManager={store.area_manager ?? areaManagerForStore(store.id, store.code)}
          />
          {listAudits()
            .filter((row) => row.entityId === store.id)
            .slice(0, 6)
            .map((row) => (
              <p key={row.id} className="t-meta mt-2 text-ink-3">
                {row.actor} · {row.field}: {row.previous || '—'} → {row.next}
              </p>
            ))}
        </Panel>

        {canEdit ? (
          <Panel elevated id="store-edit">
            <p className="t-section mb-3 text-ink">עריכה</p>
            <StoreEditControls
              id={store.id}
              name={store.name}
              city={store.city}
              isActive={store.is_active !== false}
            />
          </Panel>
        ) : null}
      </div>
    </OpsAppShell>
  )
}
