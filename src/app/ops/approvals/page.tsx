import { redirect } from 'next/navigation'
import { OpsAppShell } from '@/components/layout/ops-app-shell'
import { OpsPageHero } from '@/components/ops/ops-page-hero'
import { Panel } from '@/components/ui/primitives'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getServerActor } from '@/lib/auth/server-actor'
import { shouldAllowDemoEntry } from '@/lib/auth/home-path'
import { listSpends } from '@/lib/data/ops-ledger'
import { hydrateOpsLedger } from '@/lib/data/ops-db'
import { invoiceVariance } from '@/modules/spend/policy'
import { getLocale } from '@/lib/i18n/server'
import { translate, type MessageKey } from '@/lib/i18n/messages'
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
  searchParams: Promise<{ notice?: string }>
}) {
  const actor = await getServerActor()
  if (!actor && !shouldAllowDemoEntry()) redirect('/login')
  await hydrateOpsLedger()
  const spends = listSpends()
  const notice = (await searchParams).notice
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
        <OpsPageHero title={tx('approvals.title')} status={tx('approvals.status')} />
        {notice === 'approved' || notice === 'rejected' || notice === 'needs_info' ? (
          <p role="status" className="t-body text-ink">
            {notice === 'approved'
              ? tx('approvals.noticeApproved')
              : notice === 'rejected'
                ? tx('approvals.noticeRejected')
                : tx('approvals.noticeInfo')}
          </p>
        ) : null}
        <Panel elevated>
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
        </Panel>
        {spends.map((spend) => (
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
    </OpsAppShell>
  )
}
