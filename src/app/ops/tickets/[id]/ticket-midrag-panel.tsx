'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { Panel } from '@/components/ui/primitives'
import { MidragSearchAction } from '@/components/ops/midrag-search-action'

/**
 * Midrag search for a ticket — separate from assign/close actions.
 * Lives in the ticket body, not in the sticky HQ dock.
 */
export function TicketMidragPanel({
  category,
  city,
}: {
  category: string
  city?: string | null
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  return (
    <Panel elevated className="space-y-3">
      <div>
        <h2 className="t-body-strong text-ink">חיפוש במידרג</h2>
        <p className="t-meta mt-1 text-ink-2">
          ספק חיצוני לפי מקצוע ועיר. אחרי שמצאתם — שמרו שם וטלפון לספר אנשי
          מקצוע.
        </p>
      </div>
      <MidragSearchAction
        category={category || 'other'}
        city={city}
        onSaved={() => startTransition(() => router.refresh())}
      />
    </Panel>
  )
}
