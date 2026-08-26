'use client'

import { Button } from '@/components/ui/button'
import { ComingSoonBadge } from '@/components/ui/coming-soon-badge'

/**
 * Web Push subscribe foundation — disabled for pilot; WA + personal /tech link instead.
 */
export function TechPushSubscribe() {
  return (
    <div className="mb-3 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          size="touch"
          className="md:h-9 md:min-h-0"
          disabled
          title="בקרוב"
        >
          הפעלת התראות Push
        </Button>
        <ComingSoonBadge />
      </div>
      <p className="t-caption text-ink-3">
        בפיילוט: התראות לטכנאים דרך WhatsApp + קישור אישי לפורטל.
      </p>
    </div>
  )
}
