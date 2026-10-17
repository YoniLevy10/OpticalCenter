'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import {
  TICKET_CATEGORIES,
  TICKET_CATEGORY_LABELS_HE,
  TICKET_PRIORITIES,
  type TicketPriority,
} from '@/modules/tickets/constants'
import { classifyFaultText } from '@/modules/tickets/classify'
import {
  explainClassification,
  type ClassificationExplain,
} from '@/modules/tickets/classification-explain'
import { getSlaBreachKind } from '@/modules/tickets/sla'
import { Button } from '@/components/ui/button'
import { Input, Select } from '@/components/ui/input'
import { Panel } from '@/components/ui/primitives'
import { useToast } from '@/components/ui/toast'
import { useLocale } from '@/components/i18n/locale-provider'
import {
  correctTicketClassification,
  setTicketPriority,
  requestTicketPayment,
} from '../../work-actions'
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
  aiRaw,
  aiSummary,
  canCorrect,
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
  aiRaw?: Record<string, unknown> | null
  aiSummary?: string | null
  canCorrect: boolean
}) {
  const { locale, t } = useLocale()
  const toast = useToast()
  const [current, setCurrent] = useState(priority)
  const [currentCategory, setCurrentCategory] = useState(category)
  const [draftPriority, setDraftPriority] = useState(priority)
  const [draftCategory, setDraftCategory] = useState(
    category === 'electrical_hazard' ? 'electrical' : category,
  )
  const [reason, setReason] = useState('')
  const [explain, setExplain] = useState<ClassificationExplain>(() =>
    explainClassification({
      category,
      priority,
      aiRaw,
      aiSummary,
    }),
  )
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
    if (!canCorrect) {
      setError(t('ticket.classNoPermission'))
      toast.push({ title: t('ticket.classNoPermission'), tone: 'critical' })
      return
    }
    setError(null)
    startTransition(async () => {
      try {
        await setTicketPriority(ticketId, next)
        setCurrent(next)
        setDraftPriority(next)
        toast.push({ title: t(`priority.${next}`), tone: 'success' })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'שגיאה'
        setError(message)
        toast.push({ title: message, tone: 'critical' })
      }
    })
  }

  function saveCorrection() {
    if (!canCorrect) {
      setError(t('ticket.classNoPermission'))
      toast.push({ title: t('ticket.classNoPermission'), tone: 'critical' })
      return
    }
    setError(null)
    startTransition(async () => {
      try {
        await correctTicketClassification({
          ticketId,
          category: draftCategory,
          priority: draftPriority,
          reason: reason.trim() || undefined,
        })
        setCurrent(draftPriority)
        setCurrentCategory(draftCategory)
        setExplain(
          explainClassification({
            category: draftCategory,
            priority: draftPriority,
            aiRaw: {
              ...(aiRaw && typeof aiRaw === 'object' ? aiRaw : {}),
              source: 'manual',
              corrected: {
                at: new Date().toISOString(),
                from: { category: currentCategory, priority: current },
                to: { category: draftCategory, priority: draftPriority },
                reason: reason.trim() || null,
              },
            },
            aiSummary,
          }),
        )
        setReason('')
        toast.push({ title: t('ticket.classSaved'), tone: 'success' })
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

  const dirty =
    draftPriority !== current ||
    draftCategory !==
      (currentCategory === 'electrical_hazard' ? 'electrical' : currentCategory)

  return (
    <>
      <Panel elevated data-testid="classification-panel">
        <div className="mb-2 flex items-start justify-between gap-3">
          <p className="t-section text-ink">{t('ticket.classTitle')}</p>
          <span
            className="t-meta shrink-0 text-ink-2"
            data-testid="classification-source"
          >
            {t('ticket.classSource')}: {explain.sourceLabelHe}
          </span>
        </div>
        <p className="t-body text-ink" data-testid="classification-explanation">
          {explain.explanationHe}
        </p>
        {explain.modelFailed ? (
          <p className="t-meta mt-2 text-ink-2">{t('ticket.classModelFailed')}</p>
        ) : null}
        {explain.needsReview.length > 0 ? (
          <ul
            className="mt-3 space-y-1"
            data-testid="classification-needs-review"
          >
            {explain.needsReview.map((item) => (
              <li key={item} className="t-meta text-[var(--signal-warning)]">
                {t('ticket.classNeedsReview')}: {item}
              </li>
            ))}
          </ul>
        ) : (
          <p className="t-meta mt-2 text-ink-3">{t('ticket.classNoReview')}</p>
        )}
        {explain.corrected ? (
          <p className="t-meta mt-2 text-ink-2" data-testid="classification-audit">
            {t('ticket.classAuditBefore')}:{' '}
            {TICKET_CATEGORY_LABELS_HE[explain.corrected.fromCategory] ??
              explain.corrected.fromCategory}{' '}
            / {t(`priority.${explain.corrected.fromPriority}` as 'priority.medium')}{' '}
            → {t('ticket.classAuditAfter')}:{' '}
            {TICKET_CATEGORY_LABELS_HE[explain.corrected.toCategory] ??
              explain.corrected.toCategory}{' '}
            / {t(`priority.${explain.corrected.toPriority}` as 'priority.medium')}
          </p>
        ) : null}
      </Panel>

      <Panel elevated>
        <p className="t-section mb-3 text-ink">{t('ticket.urgency')}</p>
        <div className="flex flex-wrap gap-2" role="group" aria-label={t('ticket.urgency')}>
          {TICKET_PRIORITIES.map((level) => (
            <Button
              key={level}
              type="button"
              size="sm"
              variant={current === level ? 'primary' : 'secondary'}
              disabled={pending || !canCorrect}
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
        {suggested !== current && canCorrect ? (
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

      <Panel elevated data-testid="classification-correct">
        <p className="t-section mb-1 text-ink">{t('ticket.classCorrectTitle')}</p>
        <p className="t-meta mb-3 text-ink-2">{t('ticket.classCorrectHint')}</p>
        <div className="grid gap-2">
          <label className="grid gap-1">
            <span className="t-caption text-ink-2">{t('ticket.category')}</span>
            <Select
              value={draftCategory}
              disabled={pending || !canCorrect}
              onChange={(e) => setDraftCategory(e.target.value)}
              aria-label={t('ticket.category')}
            >
              {TICKET_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {TICKET_CATEGORY_LABELS_HE[cat] ?? cat}
                </option>
              ))}
            </Select>
          </label>
          <label className="grid gap-1">
            <span className="t-caption text-ink-2">{t('ticket.urgency')}</span>
            <Select
              value={draftPriority}
              disabled={pending || !canCorrect}
              onChange={(e) =>
                setDraftPriority(e.target.value as TicketPriority)
              }
              aria-label={t('ticket.urgency')}
            >
              {TICKET_PRIORITIES.map((level) => (
                <option key={level} value={level}>
                  {t(`priority.${level}`)}
                </option>
              ))}
            </Select>
          </label>
          <Input
            value={reason}
            disabled={pending || !canCorrect}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t('ticket.classReason')}
            aria-label={t('ticket.classReason')}
          />
          <Button
            type="button"
            variant="primary"
            disabled={pending || !canCorrect || !dirty}
            onClick={saveCorrection}
          >
            {t('ticket.classSave')}
          </Button>
          {!canCorrect ? (
            <p className="t-caption text-[var(--signal-critical)]">
              {t('ticket.classNoPermission')}
            </p>
          ) : null}
        </div>
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
          <input type="hidden" name="category" value={currentCategory} />
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
