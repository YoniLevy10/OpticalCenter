import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import {
  AlertTriangle,
  Package,
  Ticket,
} from 'lucide-react'
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
import { storeWhatsAppPrefill } from '@/modules/tickets/constants'
import { listTickets } from '@/modules/tickets/service'
import { listAssets } from '@/modules/assets/service'
import { isBreached } from '@/modules/tickets/queue'
import type { QueueTicket } from '@/modules/tickets/queue'
import { QrDownloadButtons } from '../qr-download-buttons'
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
  icon: Icon,
  iconClass,
  valueClass,
}: {
  label: string
  value: number
  href: string
  icon: typeof Ticket
  iconClass: string
  valueClass?: string
}) {
  return (
    <Link
      href={href}
      className="flex items-start gap-3 rounded-[var(--radius-lg)] border border-border bg-surface p-3.5 shadow-[var(--shadow-1)] transition-[background-color,box-shadow] duration-[var(--dur-1)] hover:bg-surface-sunken/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tenant)]"
    >
      <span
        aria-hidden
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)]',
          iconClass,
        )}
      >
        <Icon className="h-4.5 w-4.5" strokeWidth={1.75} />
      </span>
      <div className="min-w-0">
        <p className="t-caption text-ink-3">{label}</p>
        <p className={cn('t-display t-num mt-0.5 text-ink', valueClass)}>
          {value}
        </p>
      </div>
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

  const { store, backend } = await getStoreByCode(code)
  if (!store) notFound()

  const deepLink = storeWhatsAppDeepLink(store.code)
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
      label: 'נכסים',
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
          backLabel="חזרה לחנויות"
          showRefresh
        />

        <PageHeader
          title={store.name}
          meta={
            <>
              <span className="t-num" dir="ltr">
                #{store.code}
              </span>
              {backend === 'memory' ? ' · מצב דמו' : null}
              {store.is_active === false ? ' · מושבת' : null}
            </>
          }
          actions={
            <StoreSecondaryActions
              code={store.code}
              storeId={store.id}
              isActive={store.is_active !== false}
              canEdit={canEdit}
            />
          }
        />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <MetricLink
            label="תקלות פתוחות"
            value={openTickets.length}
            href={`/ops/tickets?store=${encodeURIComponent(store.code)}`}
            icon={Ticket}
            iconClass="bg-[var(--signal-progress-soft)] text-[var(--signal-progress)]"
          />
          <MetricLink
            label="נכסים"
            value={assets.length}
            href={`${base}?tab=assets`}
            icon={Package}
            iconClass="bg-[var(--signal-progress-soft)] text-[var(--signal-progress)]"
          />
          <MetricLink
            label="חריגות"
            value={exceptional.length}
            href={`${base}?tab=tickets`}
            icon={AlertTriangle}
            iconClass="bg-[var(--signal-critical-soft)] text-[var(--signal-critical)]"
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
              <PanelHeader title="QR להדפסה" meta="wa.me" />
              <div className="flex flex-col items-center gap-4 p-6">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/stores/qr?code=${encodeURIComponent(store.code)}&format=svg`}
                  alt={`QR לסניף ${store.code}`}
                  className="h-48 w-48 rounded-[var(--radius-md)] border border-border bg-surface p-2"
                />
                <QrDownloadButtons code={store.code} />
                <p className="t-caption max-w-sm text-center text-ink-3">
                  אותו קישור משמש גם לכתיבת NFC. סרקו או הדביקו על דלת הסניף.
                </p>
              </div>
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
                  meta={`${exceptional.length} חריגות`}
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
              <a
                href={deepLink}
                target="_blank"
                rel="noreferrer"
                dir="ltr"
                className="t-caption break-all text-ink-2 underline-offset-2 hover:underline"
              >
                {deepLink}
              </a>
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
