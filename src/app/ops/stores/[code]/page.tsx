import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { Ticket } from 'lucide-react'
import { OpsAppShell } from '@/components/layout/ops-app-shell'
import { PageToolbar } from '@/components/layout/page-toolbar'
import {
  PageHeader,
  Panel,
  PanelHeader,
  KeyValue,
  EmptyState,
} from '@/components/ui/primitives'
import { Button } from '@/components/ui/button'
import { SegmentedLinks } from '@/components/ui/segmented'
import { StatusLabel, PriorityText } from '@/components/ui/signal'
import { getServerActor } from '@/lib/auth/server-actor'
import { shouldAllowDemoEntry } from '@/lib/auth/home-path'
import { getStoreByCode } from '@/modules/stores/service'
import { storeWhatsAppDeepLink } from '@/modules/stores/whatsapp-link'
import { resolveWhatsAppBusinessPhone } from '@/modules/stores/business-phone'
import { storeWhatsAppPrefill } from '@/modules/tickets/constants'
import { listTickets } from '@/modules/tickets/service'
import { listAssets } from '@/modules/assets/service'
import { isBreached } from '@/modules/tickets/queue'
import type { QueueTicket } from '@/modules/tickets/queue'
import { StoreQrPanel } from '../store-qr-panel'
import { StoreEditControls } from '../store-edit-controls'
import { StoreAssetsPanel } from './store-assets-panel'
import { StoreSecondaryActions } from './store-secondary-actions'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

type TabKey = 'overview' | 'tickets' | 'assets' | 'contacts'

function isOpenStatus(status: string) {
  return status !== 'closed' && status !== 'cancelled' && status !== 'resolved'
}

function MetricLink({
  label,
  value,
  href,
  valueClass,
}: {
  label: string
  value: number
  href: string
  valueClass?: string
}) {
  return (
    <Link
      href={href}
      className="rounded-[var(--radius-lg)] border border-border bg-surface px-3.5 py-3 transition-colors hover:bg-surface-sunken/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tenant)]"
    >
      <p className="t-caption text-ink-3">{label}</p>
      <p className={cn('t-display t-num mt-0.5 text-ink', valueClass)}>
        {value}
      </p>
    </Link>
  )
}

export default async function StoreDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>
  searchParams: Promise<{ tab?: string }>
}) {
  const actor = await getServerActor()
  if (!actor && !shouldAllowDemoEntry()) {
    redirect('/login')
  }

  const { code: raw } = await params
  const sp = await searchParams
  const code = decodeURIComponent(raw).trim()
  const tabRaw = (sp.tab ?? 'overview').trim()
  const tab: TabKey = (
    ['overview', 'tickets', 'assets', 'contacts'] as const
  ).includes(tabRaw as TabKey)
    ? (tabRaw as TabKey)
    : 'overview'

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

  const [{ tickets }, { assets }] = await Promise.all([
    listTickets(500).catch(() => ({
      tickets: [],
      backend: 'memory' as const,
    })),
    listAssets({ storeId: store.id }).catch(() => ({
      assets: [],
      backend: 'memory' as const,
    })),
  ])

  const storeTickets = (tickets as unknown as QueueTicket[]).filter(
    (t) => t.store_id === store.id,
  )
  const openTickets = storeTickets.filter((t) => isOpenStatus(t.status))
  const exceptional = openTickets.filter(
    (t) => t.priority === 'critical' || isBreached(t),
  )

  const base = `/ops/stores/${encodeURIComponent(store.code)}`
  const segments = [
    { key: 'overview', label: 'סקירה', href: `${base}?tab=overview` },
    {
      key: 'tickets',
      label: 'תקלות',
      count: openTickets.length,
      href: `${base}?tab=tickets`,
    },
    {
      key: 'assets',
      label: 'ציוד',
      count: assets.length,
      href: `${base}?tab=assets`,
    },
    { key: 'contacts', label: 'אנשי קשר', href: `${base}?tab=contacts` },
  ]

  return (
    <OpsAppShell>
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        <PageToolbar
          backHref="/ops/stores"
          backLabel="חזרה לסניפים"
          showRefresh
        />

        <PageHeader
          className="hidden md:flex"
          title={store.name}
          meta={
            <>
              <span className="t-num" dir="ltr">
                #{store.code}
              </span>
              {store.is_active === false ? ' · מושבת' : null}
            </>
          }
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

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <MetricLink
            label="תקלות פתוחות"
            value={openTickets.length}
            href={`/ops/tickets?store=${encodeURIComponent(store.code)}`}
          />
          <MetricLink
            label="ציוד"
            value={assets.length}
            href={`${base}?tab=assets`}
          />
          <MetricLink
            label="זמן טיפול עבר"
            value={exceptional.length}
            href={`${base}?tab=tickets`}
            valueClass={
              exceptional.length > 0 ? 'text-[var(--signal-critical)]' : undefined
            }
          />
        </div>

        <SegmentedLinks
          segments={segments}
          activeKey={tab}
          scrollable
          className="w-full sm:w-auto"
        />

        {tab === 'overview' ? (
          <div className="flex flex-col gap-4">
            <Panel className="flex flex-col gap-1">
              <KeyValue label="עיר / אזור">{store.city ?? '—'}</KeyValue>
              <KeyValue label="כתובת">{store.address ?? '—'}</KeyValue>
              <KeyValue label="סטטוס">
                {store.is_active === false ? 'מושבת' : 'פעיל'}
              </KeyValue>
              <KeyValue label="טקסט זיהוי" ltr>
                {storeWhatsAppPrefill(store.code)}
              </KeyValue>
            </Panel>

            <Panel flush className="overflow-hidden" id="store-qr">
              <PanelHeader title="QR להדפסה" meta="WhatsApp" />
              <StoreQrPanel code={store.code} deepLink={deepLink} />
            </Panel>

            {canEdit ? (
              <Panel flush className="overflow-hidden" id="store-edit">
                <PanelHeader title="עריכה" />
                <div className="p-4">
                  <StoreEditControls
                    id={store.id}
                    name={store.name}
                    city={store.city}
                    isActive={store.is_active !== false}
                  />
                </div>
              </Panel>
            ) : null}

            {exceptional.length > 0 ? (
              <Panel flush elevated className="overflow-hidden">
                <PanelHeader
                  title="דורש תשומת לב"
                  meta={`${exceptional.length} שעבר הזמן`}
                />
                <ul className="divide-y divide-border">
                  {exceptional.slice(0, 5).map((t) => (
                    <li key={t.id}>
                      <Link
                        href={`/ops/tickets/${t.id}`}
                        className="flex min-h-[52px] items-center justify-between gap-3 px-4 py-2.5 hover:bg-surface-sunken/40"
                      >
                        <span className="t-body line-clamp-1 text-ink">
                          {t.title || t.description}
                        </span>
                        <PriorityText priority={t.priority} />
                      </Link>
                    </li>
                  ))}
                </ul>
              </Panel>
            ) : null}
          </div>
        ) : null}

        {tab === 'tickets' ? (
          <Panel flush elevated className="overflow-hidden">
            <PanelHeader
              title="תקלות בסניף"
              meta={`${openTickets.length} פתוחות`}
              action={
                <Button asChild variant="ghost" size="sm">
                  <Link
                    href={`/ops/tickets?store=${encodeURIComponent(store.code)}`}
                  >
                    לתור
                  </Link>
                </Button>
              }
            />
            {storeTickets.length === 0 ? (
              <EmptyState
                title="אין תקלות"
                description="כשתיווצר תקלה לסניף זה — היא תופיע כאן."
                icon={Ticket}
              />
            ) : (
              <ul className="divide-y divide-border">
                {storeTickets.slice(0, 40).map((t) => (
                  <li key={t.id}>
                    <Link
                      href={`/ops/tickets/${t.id}`}
                      className="flex min-h-[56px] items-center gap-3 px-4 py-2.5 hover:bg-surface-sunken/40"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="t-caption t-num text-ink-3">
                          {t.display_number ??
                            (t.number != null ? `OC-${t.number}` : '—')}
                        </p>
                        <p className="t-body mt-0.5 line-clamp-1 text-ink">
                          {t.title || t.description}
                        </p>
                      </div>
                      <StatusLabel status={t.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        ) : null}

        {tab === 'assets' ? (
          <StoreAssetsPanel storeId={store.id} storeCode={store.code} />
        ) : null}

        {tab === 'contacts' ? (
          <Panel className="flex flex-col gap-1">
            <KeyValue label="כתובת">{store.address ?? '—'}</KeyValue>
            <KeyValue label="עיר">{store.city ?? '—'}</KeyValue>
            <KeyValue label="קישור WhatsApp">
              {deepLink ? (
                <a
                  href={deepLink}
                  target="_blank"
                  rel="noreferrer"
                  dir="ltr"
                  className="t-caption break-all text-ink-2 underline-offset-2 hover:underline"
                >
                  {deepLink}
                </a>
              ) : (
                <span className="text-ink-3">חסר מספר עסקי — הגדירו בהגדרות</span>
              )}
            </KeyValue>
            <KeyValue label="טקסט זיהוי" ltr>
              {storeWhatsAppPrefill(store.code)}
            </KeyValue>
            <p className="t-caption mt-3 text-ink-3">
              מספרי טלפון של עובדי סניף ממופים דרך WhatsApp כשקיימים ב־store
              phones.
            </p>
          </Panel>
        ) : null}
      </div>
    </OpsAppShell>
  )
}
