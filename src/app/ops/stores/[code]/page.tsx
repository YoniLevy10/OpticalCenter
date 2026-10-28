import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { OpsAppShell } from '@/components/layout/ops-app-shell'
import { PageToolbar } from '@/components/layout/page-toolbar'
import {
  Panel,
  PanelHeader,
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
import { OPEN_TICKET_STATUSES, TICKET_CATEGORY_LABELS_HE } from '@/modules/tickets/constants'
import { listAssets } from '@/modules/assets/service'
import { findRecurrences, type HistoryTicket } from '@/modules/tickets/recurrence'
import {
  countedApprovedAmount,
  countedPendingAmount,
  formatShekels,
  summarizeAssetSpend,
} from '@/modules/spend/asset-cost'
import { StoreQrPanel } from '../store-qr-panel'
import { StoreEditControls } from '../store-edit-controls'
import { StoreDirectoryPanel } from '../store-directory-panel'
import { StoreAssetsPanel } from './store-assets-panel'
import { StoreSecondaryActions } from './store-secondary-actions'
import { StoreVisitDispatch } from './store-visit-dispatch'
import { hydrateOpsLedger } from '@/lib/data/ops-db'
import {
  areaManagerForStore,
  listAudits,
  listContactsForStore,
  listDocuments,
  listSpends,
  spendForTicket,
} from '@/lib/data/ops-ledger'
import { executionBlockReason } from '@/modules/spend/policy'
import { documentTypeLabel, isDocumentOverdue } from '@/modules/documents/rules'
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
  await hydrateOpsLedger()
  const storeDocuments = listDocuments().filter(
    (doc) => doc.storeCode === store.code && !doc.renewed,
  )

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
  const historyResult = await listTickets({
    storeCode: store.code,
    limit: 80,
  }).catch(() => ({ tickets: [] as typeof tickets }))
  const storeTickets = historyResult.tickets.filter(
    (t) => t.store_id === store.id || t.stores?.code === store.code,
  )
  const history: HistoryTicket[] = storeTickets.map((ticket) => ({
    id: ticket.id,
    storeId: ticket.store_id,
    category: ticket.category,
    assetId: ticket.asset_id ?? null,
    description: ticket.description,
    status: ticket.status,
    createdAt: ticket.created_at,
    resolvedAt: ticket.resolved_at ?? null,
  }))
  const seenRepeats = new Set<string>()
  const repeatRows: { id: string; title: string; category: string; count: number }[] = []
  for (const ticket of storeTickets) {
    const current = history.find((row) => row.id === ticket.id)
    if (!current) continue
    const hits = findRecurrences(current, history)
    if (hits.length === 0) continue
    const key = `${ticket.category}:${ticket.asset_id ?? ''}`
    if (seenRepeats.has(key)) continue
    seenRepeats.add(key)
    repeatRows.push({
      id: ticket.id,
      title: ticket.title || ticket.description,
      category: TICKET_CATEGORY_LABELS_HE[ticket.category] ?? ticket.category,
      count: hits.length,
    })
  }
  const storeSpends = listSpends().filter((spend) => spend.storeCode === store.code)
  const approvedSpend = storeSpends.reduce(
    (sum, spend) => sum + (countedApprovedAmount(spend) ?? 0),
    0,
  )
  const pendingSpend = storeSpends.reduce(
    (sum, spend) => sum + (countedPendingAmount(spend) ?? 0),
    0,
  )
  const { assets: allAssets } = await listAssets().catch(() => ({
    assets: [] as Awaited<ReturnType<typeof listAssets>>['assets'],
  }))
  const storeAssets = allAssets.filter(
    (asset) => asset.store_id === store.id || asset.store_code === store.code,
  )
  const assetLines = storeAssets.map((asset) => {
    const cost = summarizeAssetSpend(
      storeSpends,
      history.map((row) => ({ id: row.id, assetId: row.assetId })),
      asset.id,
    )
    const repeats = history.filter(
      (row) => row.assetId === asset.id && findRecurrences(row, history).length > 0,
    ).length
    return { asset, cost, repeats }
  })

  return (
    <OpsAppShell>
      <div className="mx-auto flex max-w-xl flex-col gap-5">
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

        <section className="grid grid-cols-3 gap-px overflow-hidden rounded-xl bg-border">
            <div className="bg-card px-3 py-3">
            <p className="text-xs text-muted-foreground">{p('פתוחות')}</p>
            <p className="mt-1 text-sm font-medium tabular-nums">{openCount}</p>
          </div>
            <div className="bg-card px-3 py-3">
            <p className="text-xs text-muted-foreground">{p('חזרו')}</p>
            <p className="mt-1 text-sm font-medium tabular-nums">{repeatRows.length}</p>
          </div>
            <div className="bg-card px-3 py-3">
            <p className="text-xs text-muted-foreground">{p('שולם')}</p>
            <p className="mt-1 text-sm font-medium tabular-nums">
              {approvedSpend > 0 ? formatShekels(approvedSpend) : p('אין עלות')}
            </p>
            {pendingSpend > 0 ? (
              <p className="mt-1 text-xs text-muted-foreground">
                {p('ממתין')} {formatShekels(pendingSpend)}
              </p>
            ) : null}
          </div>
        </section>

        <Panel flush>
          <PanelHeader title="ציוד" meta={storeAssets.length ? String(storeAssets.length) : undefined} />
          {assetLines.length === 0 ? (
            <p className="t-body px-4 py-6 text-ink-2">{p('אין ציוד מקושר לסניף הזה.')}</p>
          ) : (
            <ul className="divide-y divide-border">
              {assetLines.map(({ asset, cost, repeats }) => (
                <li key={asset.id} className="flex items-baseline justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="t-body text-ink">{asset.name}</p>
                    <p className="t-meta text-ink-3">
                      {TICKET_CATEGORY_LABELS_HE[asset.asset_type] ?? asset.asset_type}
                      {repeats > 0 ? ` · ${repeats} ${p('חזרו')}` : ''}
                    </p>
                  </div>
                  <span className="t-meta t-num shrink-0 text-ink">
                    {cost.approved > 0 ? formatShekels(cost.approved) : '—'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel flush>
          <PanelHeader
            title="תקלות שחזרו"
            meta={repeatRows.length ? String(repeatRows.length) : undefined}
          />
          {repeatRows.length === 0 ? (
            <p className="t-body px-4 py-6 text-ink-2">{p('אין תקלה שחזרה בסניף הזה.')}</p>
          ) : (
            <ul className="divide-y divide-border">
              {repeatRows.slice(0, 8).map((row) => (
                <li key={row.id}>
                  <Link href={`/ops/tickets/${row.id}`} className="block px-4 py-3">
                    <p className="t-body text-ink">{row.title}</p>
                    <p className="t-meta text-ink-3">
                      {row.category} · {row.count} {p('פעמים')}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

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

        <Panel elevated>
          <p className="t-section mb-3 text-ink">תיקיית סניף</p>
          {storeDocuments.length === 0 ? (
            <p className="t-meta text-ink-2">אין מסמכים בתיקייה הזו.</p>
          ) : (
            <ul className="divide-y divide-border">
              {storeDocuments.map((doc) => {
                const expiry = doc.extractedExpiry?.slice(0, 10)
                const shown = expiry
                  ? `${expiry.slice(8, 10)}.${expiry.slice(5, 7)}.${expiry.slice(0, 4)}`
                  : 'אין תאריך'
                return (
                  <li key={doc.id} className="py-3">
                    <p className="t-body">
                      {documentTypeLabel(doc.docType)} · {shown}
                      {isDocumentOverdue(doc) ? ' · באיחור' : ''}
                    </p>
                    {doc.sourceUrl ? (
                      <a className="t-meta text-ink underline" href={doc.sourceUrl} target="_blank" rel="noreferrer">
                        קובץ המקור
                      </a>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          )}
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
              spendBlock: executionBlockReason(spendForTicket(t.id)),
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
