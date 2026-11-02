import { redirect } from 'next/navigation'
import { OpsAppShell } from '@/components/layout/ops-app-shell'
import { OpsPageHero } from '@/components/ops/ops-page-hero'
import { Panel } from '@/components/ui/primitives'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getServerActor } from '@/lib/auth/server-actor'
import { shouldAllowDemoEntry } from '@/lib/auth/home-path'
import { scopeTicketsForActor } from '@/lib/auth/ticket-scope'
import { listOutcomes, listSpends } from '@/lib/data/ops-ledger'
import { parseBundleScope } from '@/modules/recommendations/commit'
import { hydrateOpsLedger } from '@/lib/data/ops-db'
import { approvalBrief } from '@/modules/spend/brief'
import { invoiceVariance } from '@/modules/spend/policy'
import {
  bandFromPrices,
  categorySamples,
  estimateFaultCost,
  formatCostBand,
} from '@/modules/recommendations/estimate'
import { recommendBundles, type BundleFault } from '@/modules/whatsapp/agent/bundle'
import {
  normalizeTicketCategory,
  OPEN_TICKET_STATUSES,
  TICKET_CATEGORY_LABELS_HE,
} from '@/modules/tickets/constants'
import { photosForTickets } from '@/modules/tickets/attachments'
import { listTickets } from '@/modules/tickets/service'
import { ticketIsUrgent } from '@/modules/tickets/urgent'
import { loadMidragResults } from '@/modules/vendors/midrag/live-results'
import { ApprovalCard } from './approval-card'
import { approveFromBrief } from './brief-actions'
import { PhoneFold, PhoneFoldStack } from '@/components/layout/phone-fold'
import { translate, type MessageKey } from '@/lib/i18n/messages'
import { getLocale } from '@/lib/i18n/server'
import {
  actualSpendAction,
  decideSpendAction,
  reviseSpendAction,
  submitSpend,
} from '../work-actions'

export const dynamic = 'force-dynamic'

export default async function ApprovalsPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; open?: string }>
}) {
  const actor = await getServerActor()
  if (!actor && !shouldAllowDemoEntry()) redirect('/login')
  await hydrateOpsLedger()
  const spends = listSpends()
  const { tickets } = await listTickets({
    limit: 300,
    statuses: [...OPEN_TICKET_STATUSES],
  }).catch(() => ({ tickets: [] }))
  const visible = actor ? scopeTicketsForActor(actor, tickets) : tickets
  const awaiting = visible.filter(
    (ticket) => ticketIsUrgent(ticket) && ticket.status !== 'engaged',
  )
  const faultById = new Map<string, string>()
  for (const ticket of visible) {
    const text = ticket.title?.trim() || ticket.description?.trim()
    if (text) faultById.set(ticket.id, text)
  }
  const waiting = spends
    .filter((spend) => spend.status === 'pending' || spend.status === 'needs_info')
    .sort((a, b) => Number(b.urgent) - Number(a.urgent))
  const bundles = waiting.filter((spend) => parseBundleScope(spend.scope))
  const otherWaiting = waiting.filter((spend) => !parseBundleScope(spend.scope))
  const waitingOrdered = [...bundles, ...otherWaiting]
  const settled = spends.filter(
    (spend) => spend.status !== 'pending' && spend.status !== 'needs_info',
  )
  const params = await searchParams
  const notice = params.notice
  const openId = params.open ?? null
  const categoryByTicketId: Record<string, string> = {}
  for (const ticket of visible) {
    if (ticket.category) categoryByTicketId[ticket.id] = ticket.category
  }
  const samples = categorySamples({
    outcomes: listOutcomes(),
    spends,
    categoryByTicketId,
  })
  const bundleFaults: BundleFault[] = visible.map((ticket) => ({
    id: ticket.id,
    storeId: ticket.store_id,
    storeName: ticket.stores?.name || ticket.stores?.code || 'סניף',
    category: ticket.category,
    priority: ticket.priority,
    status: ticket.status,
    summary: ticket.title || ticket.description,
    createdAt: ticket.created_at,
    regionId: ticket.region_id,
    urgent: ticketIsUrgent(ticket),
    dispatched: ticket.status === 'engaged' || ticket.status === 'waiting_vendor',
  }))
  const companionsByLead = new Map<string, { id: string; storeName: string; summary: string }[]>()
  for (const card of recommendBundles({ open: bundleFaults })) {
    if (card.kind !== 'urgent' || card.ticketIds.length < 2) continue
    const [lead, ...rest] = card.ticketIds
    companionsByLead.set(
      lead!,
      rest.map((id) => {
        const row = visible.find((ticket) => ticket.id === id)
        return {
          id,
          storeName: row?.stores?.name || row?.stores?.code || 'סניף',
          summary: row?.title || row?.description || 'תקלה',
        }
      }),
    )
  }
  const photos = await photosForTickets(awaiting.map((ticket) => ticket.id))
  const opened = openId ? awaiting.find((ticket) => ticket.id === openId) : null
  const midrag = opened
    ? await loadMidragResults({
        category: opened.category,
        city: opened.stores?.city ?? null,
      }).catch(() => null)
    : null
  const locale = await getLocale()
  const tx = (key: MessageKey, vars?: Record<string, string | number>) =>
    translate(locale, key, vars)
  const spendStatus = (status: string) => {
    if (status === 'pending') return tx('spend.pending')
    if (status === 'approved') return tx('spend.approved')
    if (status === 'rejected') return tx('spend.rejected')
    if (status === 'needs_info') return tx('spend.needs_info')
    return status
  }

  return (
    <OpsAppShell>
      <div className="mx-auto flex max-w-2xl flex-col gap-5">
        <OpsPageHero
          title="מחכות לאישור"
          status={
            awaiting.length === 0
              ? 'אין תקלות שמחכות לאישור'
              : `${awaiting.length} מחכות לאישור`
          }
        />
        <PhoneFoldStack>
        {awaiting.length === 0 ? (
          <p className="t-body text-ink-2">אין תקלות דחופות שמחכות לארי.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {awaiting.map((ticket) => {
              const fault = faultById.get(ticket.id) || 'תקלה'
              const store = ticket.stores?.name || ticket.stores?.code || 'סניף'
              const category =
                TICKET_CATEGORY_LABELS_HE[ticket.category] || ticket.category
              const estimate = estimateFaultCost(
                ticket.category,
                bandFromPrices(
                  samples.get(normalizeTicketCategory(ticket.category)) ?? [],
                ),
              )
              const range = formatCostBand(estimate.band)
              const rangeLine =
                estimate.basis === 'recorded'
                  ? `טווח משוער ${range} · לפי מה שכבר שולם`
                  : `טווח משוער ${range}`
              const companions = companionsByLead.get(ticket.id) ?? []
              const open = ticket.id === openId
              return (
                <ApprovalCard
                  key={ticket.id}
                  ticketId={ticket.id}
                  store={store}
                  category={category}
                  fault={fault}
                  rangeLine={rangeLine}
                  companionCount={companions.length}
                  photos={photos[ticket.id] ?? []}
                  open={open}
                  urgent={ticketIsUrgent(ticket)}
                  status={ticket.status}
                  locked={null}
                  pros={open ? (midrag?.pros ?? []) : []}
                  searchUrl={open ? (midrag?.searchUrl ?? '') : ''}
                  fallback={open ? (midrag?.fallback ?? true) : false}
                  companions={open ? companions : []}
                />
              )
            })}
          </div>
        )}
        {waiting.length > 0 ? (
          <div className="flex flex-col gap-3">
            {waitingOrdered.map((spend, index) => {
              const brief = approvalBrief(
                spend,
                spend.ticketId ? faultById.get(spend.ticketId) ?? null : null,
              )
              const bundle = Boolean(parseBundleScope(spend.scope))
              const actions = (
                <>
                  <div>
                    <p className="t-caption text-ink-3">מה</p>
                    <p className="t-body text-ink">{brief.what}</p>
                    <p className="t-title t-num mt-2 text-ink">{spend.requestedAmount}</p>
                  </div>
                  {spend.urgent ? <p className="t-meta text-ink-2">דחוף</p> : null}
                  {spend.status === 'needs_info' ? (
                    <p className="t-meta text-ink-2">חסר מידע לפני אישור.</p>
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    <form action={approveFromBrief}>
                      <input type="hidden" name="id" value={spend.id} />
                      <input type="hidden" name="kind" value={bundle ? 'bundle' : 'spend'} />
                      <Button type="submit" size="sm">{bundle ? 'אשר ביקור' : 'אשר'}</Button>
                    </form>
                    <form action={decideSpendAction}>
                      <input type="hidden" name="id" value={spend.id} />
                      <input type="hidden" name="decision" value="rejected" />
                      <Button type="submit" size="sm" variant="secondary">{tx('approvals.reject')}</Button>
                    </form>
                    <form action={decideSpendAction}>
                      <input type="hidden" name="id" value={spend.id} />
                      <input type="hidden" name="decision" value="needs_info" />
                      <Button type="submit" size="sm" variant="secondary">{tx('approvals.needsInfo')}</Button>
                    </form>
                  </div>
                </>
              )
              if (index > 0) {
                return (
                  <PhoneFold
                    key={spend.id}
                    title={brief.what}
                    summary={String(spend.requestedAmount)}
                  >
                    <div className="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-border bg-surface p-5 shadow-[var(--shadow-1)]">
                      {actions}
                      <p className="t-body text-ink">{brief.who}</p>
                      <p className="t-meta text-ink-2">{brief.whom}</p>
                    </div>
                  </PhoneFold>
                )
              }
              return (
                <div
                  key={spend.id}
                  className="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-border bg-surface p-5 shadow-[var(--shadow-1)]"
                >
                  {actions}
                  <PhoneFold title="פירוט" summary={`${brief.who} · ${brief.whom}`}>
                    <p className="t-body text-ink">{brief.who}</p>
                    <p className="t-meta text-ink-2">{brief.whom}</p>
                  </PhoneFold>
                </div>
              )
            })}
          </div>
        ) : null}
          <PhoneFold title={tx('approvals.title')} summary="לא לשימוש יומיומי">
          <p className="t-meta mb-2 text-ink-2">{tx('approvals.onBehalf')}</p>
          <form action={submitSpend} className="grid gap-2">
            <Input name="storeCode" placeholder="קוד סניף" required />
            <Input name="storeName" placeholder="שם סניף" required />
            <Input name="reason" placeholder="סיבה" required />
            <Input name="vendor" placeholder="ספק" />
            <Input name="amount" type="number" placeholder="סכום מבוקש" required />
            <Input name="scope" placeholder="היקף" />
            <label className="t-meta flex items-center gap-2">
              <input type="checkbox" name="urgent" /> {tx('approvals.urgent')}
            </label>
            <Button type="submit">{tx('approvals.submit')}</Button>
          </form>
          </PhoneFold>
          {settled.length > 0 ? (
          <PhoneFold title="הוצאות שנרשמו" summary={String(settled.length)}>
          <div className="flex flex-col gap-3">
        {settled.map((spend) => (
          <Panel key={spend.id} elevated>
            <p className="t-body">
              {spend.storeCode} · {spend.storeName} · {spend.reason}
            </p>
            <p className="t-meta text-ink-2">
              {tx('approvals.by')} {spend.requestedBy || '—'} · {tx('approvals.requested')}{' '}
              {spend.requestedAmount} · {tx('approvals.approved')} {spend.approvedAmount ?? '—'} ·{' '}
              {tx('approvals.actual')} {spend.actualAmount ?? '—'} · {spend.vendorName || tx('approvals.noVendor')} ·{' '}
              {spendStatus(spend.status)}
              {spend.needsReapproval ? ` · ${tx('approvals.reapproval')}` : ''}
              {invoiceVariance(spend) ? ` · ${tx('approvals.variance')}` : ''}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <form action={decideSpendAction}>
                <input type="hidden" name="id" value={spend.id} />
                <input type="hidden" name="decision" value="approved" />
                <Button type="submit" size="sm" variant="primary">{tx('approvals.approve')}</Button>
              </form>
              <form action={decideSpendAction}>
                <input type="hidden" name="id" value={spend.id} />
                <input type="hidden" name="decision" value="rejected" />
                <Button type="submit" size="sm" variant="secondary">{tx('approvals.reject')}</Button>
              </form>
              <form action={decideSpendAction}>
                <input type="hidden" name="id" value={spend.id} />
                <input type="hidden" name="decision" value="needs_info" />
                <Button type="submit" size="sm" variant="secondary">{tx('approvals.needsInfo')}</Button>
              </form>
            </div>
            <form action={reviseSpendAction} className="mt-2 flex flex-wrap gap-2">
              <input type="hidden" name="id" value={spend.id} />
              <Input name="amount" type="number" defaultValue={spend.requestedAmount} aria-label="סכום" />
              <Input name="vendor" defaultValue={spend.vendorName ?? ''} aria-label="ספק" />
              <Input name="scope" defaultValue={spend.scope ?? ''} aria-label="היקף" />
              <Button type="submit" size="sm">{tx('approvals.revise')}</Button>
            </form>
            <form action={actualSpendAction} className="mt-2 flex gap-2">
              <input type="hidden" name="id" value={spend.id} />
              <Input name="actual" type="number" placeholder="עלות בפועל" aria-label="עלות בפועל" />
              <Button type="submit" size="sm">{tx('approvals.invoice')}</Button>
            </form>
          </Panel>
        ))}
          </div>
          </PhoneFold>
          ) : null}
        </PhoneFoldStack>
        {notice === 'approved' || notice === 'rejected' || notice === 'needs_info' ? (
          <p role="status" className="t-body text-ink">
            {notice === 'approved'
              ? tx('approvals.noticeApproved')
              : notice === 'rejected'
                ? tx('approvals.noticeRejected')
                : tx('approvals.noticeInfo')}
          </p>
        ) : null}
      </div>
    </OpsAppShell>
  )
}
