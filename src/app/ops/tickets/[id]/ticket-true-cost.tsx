import { Panel, KeyValue } from '@/components/ui/primitives'
import { formatIls, trueCostBreakdown } from '@/modules/spend/true-cost'
import type { SpendRequest } from '@/modules/spend/policy'
import { translate, type MessageKey } from '@/lib/i18n/messages'
import type { Locale } from '@/lib/i18n/locale'

/** Recorded spend, with an estimate beside it until a quote is written. */
export function TicketTrueCostPanel({
  ticketSpends,
  assetSpends,
  locale,
  estimate,
}: {
  ticketSpends: SpendRequest[]
  assetSpends?: SpendRequest[]
  locale: Locale
  estimate?: { text: string; basis: 'recorded' | 'kind' } | null
}) {
  const t = (key: MessageKey) => translate(locale, key)
  const ticket = trueCostBreakdown(ticketSpends)
  const asset = assetSpends ? trueCostBreakdown(assetSpends) : null

  return (
    <Panel elevated>
      <p className="t-section mb-3 text-ink">{t('ticket.trueCost')}</p>
      {estimate ? (
        <p className="t-body mb-3 text-ink">
          משוער <span className="t-num font-medium">{estimate.text}</span>
          <span className="t-meta mt-1 block text-ink-3">
            {estimate.basis === 'recorded'
              ? 'לפי מה שכבר שולם על תקלות מאותו סוג'
              : 'לפי סוג התקלה. מחיר שנרשם מחליף את ההערכה.'}
          </span>
        </p>
      ) : null}
      {ticket.count === 0 ? (
        <p className="t-meta text-ink-2">{t('ticket.trueCostEmpty')}</p>
      ) : (
        <dl className="divide-y divide-border">
          <KeyValue label={t('ticket.trueCost')}>
            <span className="t-num font-medium">{formatIls(ticket.total)}</span>
          </KeyValue>
          {ticket.paid > 0 ? (
            <KeyValue label={t('ticket.trueCostPaid')}>
              <span className="t-num">{formatIls(ticket.paid)}</span>
            </KeyValue>
          ) : null}
          {ticket.approved > 0 ? (
            <KeyValue label={t('ticket.trueCostApproved')}>
              <span className="t-num">{formatIls(ticket.approved)}</span>
            </KeyValue>
          ) : null}
          {ticket.pending > 0 ? (
            <KeyValue label={t('ticket.trueCostPending')}>
              <span className="t-num">{formatIls(ticket.pending)}</span>
            </KeyValue>
          ) : null}
          {asset && asset.count > 0 && asset.total !== ticket.total ? (
            <KeyValue label={t('ticket.trueCostAsset')}>
              <span className="t-num">{formatIls(asset.total)}</span>
            </KeyValue>
          ) : null}
        </dl>
      )}
    </Panel>
  )
}
