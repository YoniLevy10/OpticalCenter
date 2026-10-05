'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { TICKET_PRIORITIES, type TicketPriority } from '@/modules/tickets/constants'
import { classifyFaultText } from '@/modules/tickets/classify'
import { getSlaBreachKind } from '@/modules/tickets/sla'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Panel } from '@/components/ui/primitives'
import { useToast } from '@/components/ui/toast'
import { useLocale } from '@/components/i18n/locale-provider'
import { setTicketPriority, requestTicketPayment } from '../../work-actions'
import { formatIsraeliPhoneDisplay } from '@/lib/phone'
import { cn } from '@/lib/utils'

type MatchRow = {
  id: string
  name: string
  detail: string
  phone: string | null
  reason: string
}

export function TicketTrialPanel({
  ticketId,
  description,
  priority,
  category,
  status,
  slaRespondBy,
  slaResolveBy,
  firstResponseAt,
  resolvedAt,
  respondHours,
  resolveHours,
  storeId,
  storeCode,
  storeName,
  matches,
}: {
  ticketId: string
  description: string
  priority: TicketPriority
  category: string
  status: string
  slaRespondBy: string | null
  slaResolveBy: string | null
  firstResponseAt: string | null
  resolvedAt: string | null
  respondHours: number
  resolveHours: number
  storeId: string
  storeCode: string
  storeName: string
  matches: MatchRow[]
}) {
  const { locale, t } = useLocale()
  const toast = useToast()
  const [current, setCurrent] = useState(priority)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const suggested = classifyFaultText(description).priority
  const breach = getSlaBreachKind({
    status,
    sla_respond_by: slaRespondBy,
    sla_resolve_by: slaResolveBy,
    first_response_at: firstResponseAt,
    resolved_at: resolvedAt,
  })
  const dateLocale = locale === 'he' ? 'he-IL' : locale === 'fr' ? 'fr-FR' : 'en-GB'

  function when(iso: string | null) {
    if (!iso) return '—'
    return new Intl.DateTimeFormat(dateLocale, {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso))
  }

  function choose(next: TicketPriority) {
    setError(null)
    startTransition(async () => {
      try {
        await setTicketPriority(ticketId, next)
        setCurrent(next)
        toast.push({ title: t(`priority.${next}`), tone: 'success' })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'שגיאה'
        setError(message)
        toast.push({ title: message, tone: 'critical' })
      }
    })
  }

  const breachText =
    breach === 'resolve'
      ? t('ticket.slaBreachResolve')
      : breach === 'respond'
        ? t('ticket.slaBreachRespond')
        : t('ticket.slaOk')

  return (
    <>
      <Panel elevated>
        <p className="t-section mb-3 text-ink">{t('ticket.urgency')}</p>
        <div className="flex flex-wrap gap-2" role="group" aria-label={t('ticket.urgency')}>
          {TICKET_PRIORITIES.map((level) => (
            <Button
              key={level}
              type="button"
              size="sm"
              variant={current === level ? 'primary' : 'secondary'}
              disabled={pending}
              aria-pressed={current === level}
              onClick={() => choose(level)}
            >
              {t(`priority.${level}`)}
            </Button>
          ))}
        </div>
        {suggested !== current ? (
          <p className="t-meta mt-3 text-ink-2">
            {t('ticket.suggest', { priority: t(`priority.${suggested}`) })}
          </p>
        ) : null}
        {suggested !== current ? (
          <Button
            type="button"
            size="sm"
            className="mt-2"
            disabled={pending}
            onClick={() => choose(suggested)}
          >
            {t('ticket.applySuggest')}
          </Button>
        ) : null}
        {error ? <p className="t-caption mt-2 text-[var(--signal-critical)]">{error}</p> : null}
      </Panel>

      <Panel elevated>
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="t-section text-ink">{t('ticket.slaTitle')}</p>
          <Link href="/ops/settings" className="t-meta text-[var(--tenant)]">
            {t('ticket.slaSettings')}
          </Link>
        </div>
        <p
          className={cn(
            't-body',
            breach === 'none' ? 'text-ink-2' : 'text-[var(--signal-critical)]',
          )}
        >
          {breachText}
        </p>
        <p className="t-meta mt-1 text-ink-2">
          {t('ticket.slaRespond')} {when(slaRespondBy)} · {t('ticket.slaResolve')}{' '}
          {when(slaResolveBy)}
        </p>
        <p className="t-meta mt-1 text-ink-3">
          {t('ticket.slaWindow', { respond: respondHours, resolve: resolveHours })}
        </p>
        <p className="t-caption mt-2 text-ink-3">{t('ticket.slaHint')}</p>
      </Panel>

      <Panel elevated>
        <p className="t-section mb-3 text-ink">{t('ticket.prosTitle')}</p>
        {matches.length === 0 ? (
          <p className="t-body text-ink-2">{t('ticket.prosEmpty')}</p>
        ) : (
          <ul className="divide-y divide-border">
            {matches.map((row) => (
              <li key={row.id} className="py-2">
                <p className="t-body text-ink">
                  {row.name}
                  {row.detail ? <span className="text-ink-2"> · {row.detail}</span> : null}
                </p>
                <p className="t-meta text-ink-3">
                  {row.reason}
                  {row.phone ? ` · ${formatIsraeliPhoneDisplay(row.phone)}` : ''}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel elevated>
        <p className="t-section mb-1 text-ink">{t('ticket.payTitle')}</p>
        <p className="t-meta mb-3 text-ink-2">{t('ticket.payHint')}</p>
        <form action={requestTicketPayment} className="grid gap-2">
          <input type="hidden" name="ticketId" value={ticketId} />
          <input type="hidden" name="storeId" value={storeId} />
          <input type="hidden" name="storeCode" value={storeCode} />
          <input type="hidden" name="storeName" value={storeName} />
          <input type="hidden" name="priority" value={current} />
          <input type="hidden" name="category" value={category} />
          <Input name="amount" type="number" min={1} required placeholder={t('ticket.payAmount')} aria-label={t('ticket.payAmount')} />
          <Input name="vendor" placeholder={t('ticket.payVendor')} aria-label={t('ticket.payVendor')} />
          <Input name="reason" required placeholder={t('ticket.payReason')} aria-label={t('ticket.payReason')} defaultValue={description.slice(0, 80)} />
          <label className="t-meta flex items-center gap-2">
            <input type="checkbox" name="urgent" defaultChecked={current === 'critical' || current === 'high'} />
            {t('ticket.payUrgent')}
          </label>
          <Button type="submit" variant="primary">
            {t('ticket.paySubmit')}
          </Button>
        </form>
      </Panel>
    </>
  )
}
