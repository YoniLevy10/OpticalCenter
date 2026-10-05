import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { OpsAppShell } from '@/components/layout/ops-app-shell'
import { PageToolbar } from '@/components/layout/page-toolbar'
import {
  Panel,
  KeyValue,
} from '@/components/ui/primitives'
import { Button } from '@/components/ui/button'
import { OpsPageHero } from '@/components/ops/ops-page-hero'
import { getServerActor } from '@/lib/auth/server-actor'
import { shouldAllowDemoEntry } from '@/lib/auth/home-path'
import { getStoreByCode } from '@/modules/stores/service'
import { storeWhatsAppDeepLink } from '@/modules/stores/whatsapp-link'
import { resolveWhatsAppBusinessPhone } from '@/modules/stores/business-phone'
import { listTickets } from '@/modules/tickets/service'
import { StoreQrPanel } from '../store-qr-panel'
import { StoreEditControls } from '../store-edit-controls'
import { StoreDirectoryPanel } from '../store-directory-panel'
import { areaManagerForStore, listAudits, listContactsForStore } from '@/lib/data/ops-ledger'
import { regionLabel } from '@/modules/stores/regions'
import { getLocale } from '@/lib/i18n/server'
import { phrase } from '@/lib/i18n/phrases'

export const dynamic = 'force-dynamic'

function isOpenStatus(status: string) {
  return status !== 'closed' && status !== 'cancelled' && status !== 'resolved'
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

  const { tickets } = await listTickets(500).catch(() => ({
    tickets: [],
    backend: 'memory' as const,
  }))

  const openCount = tickets.filter(
    (t) => t.store_id === store.id && isOpenStatus(t.status),
  ).length

  return (
    <OpsAppShell>
      <div className="mx-auto flex max-w-xl flex-col gap-5 stagger">
        <PageToolbar
          backHref="/ops/stores"
          backLabel="חזרה לחנויות"
          showRefresh
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

        <Button asChild variant="primary" size="touch" className="w-full">
          <Link
            href={`/ops/tickets?view=open&store=${encodeURIComponent(store.code)}`}
          >
            תקלות פתוחות בחנות זו: {openCount}
          </Link>
        </Button>

        <Panel elevated className="overflow-hidden" id="store-qr">
          <p className="t-section mb-3 text-ink">הורדת QR</p>
          <StoreQrPanel code={store.code} deepLink={deepLink} />
        </Panel>

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
