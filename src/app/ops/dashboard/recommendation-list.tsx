'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import {
  approveBundleNow,
  sendBundleApproval,
} from '@/app/ops/dashboard/bundle-actions'
import type { RecommendationCardModel } from '@/modules/recommendations/present'
import { usePhrase } from '@/components/i18n/locale-provider'

export function RecommendationList({
  cards,
  notice,
}: {
  cards: RecommendationCardModel[]
  notice: string | null
}) {
  if (cards.length === 0) {
    return (
      <div className="rounded-[var(--radius-xl)] border border-border bg-surface px-5 py-12 text-center shadow-[var(--shadow-1)]">
        {notice ? <p className="t-body mb-3 text-ink">{notice}</p> : null}
        <p className="t-title text-ink">הכל שקט</p>
        <p className="t-body mt-2 text-ink-2">אין פריטים שמחכים להחלטה.</p>
      </div>
    )
  }

  return (
    <ul className="flex flex-col gap-4">
      {notice ? (
        <li>
          <p role="status" className="t-body text-ink">
            {notice}
          </p>
        </li>
      ) : null}
      {cards.map((card) => (
        <li
          key={card.id}
          className="flex flex-col gap-3 rounded-[var(--radius-xl)] border border-border bg-surface p-5 shadow-[var(--shadow-1)]"
        >
          <h2 className="t-title text-ink">{card.storeName}</h2>
          <p className="t-lead text-ink">{card.sentence}</p>
          {card.costLine ? <p className="t-body text-ink-2">{card.costLine}</p> : null}
          {card.personLine ? <p className="t-meta text-ink-2">{card.personLine}</p> : null}
          <CardAction card={card} />
        </li>
      ))}
    </ul>
  )
}

function CardAction({ card }: { card: RecommendationCardModel }) {
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const phrase = usePhrase()
  const variant = 'primary' as const

  if (card.href && !done) {
    return (
      <Button asChild variant={variant} size="touch" className="w-full">
        <Link href={card.href}>{card.actionLabel}</Link>
      </Button>
    )
  }

  if (done) {
    return (
      <p role="status" className="t-body text-ink">
        {done}
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {card.spendId ? (
        <p className="t-meta text-ink-2">{phrase('האישור נעשה כאן, לא בוואטסאפ')}</p>
      ) : null}
      <Button
        type="button"
        variant={variant}
        size="touch"
        className="w-full"
        disabled={pending}
        onClick={() => {
          setError(null)
          start(async () => {
            const result = card.spendId
              ? await approveBundleNow(card.spendId)
              : card.request
                ? await sendBundleApproval(card.request)
                : { error: 'אין פעולה לכרטיס', notice: null }
            if (result.error) setError(result.error)
            else if (result.notice) setDone(result.notice)
          })
        }}
      >
        {card.spendId ? 'אשר הזמנה' : card.actionLabel}
      </Button>
      {error ? <p className="t-body text-[var(--signal-critical)]">{error}</p> : null}
    </div>
  )
}
