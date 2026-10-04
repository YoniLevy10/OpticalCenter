'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { MidragSearchAction } from '@/components/ops/midrag-search-action'

/** Midrag open + manual save — wired on אנשי מקצוע (not on ticket detail). */
export function ProfessionalsMidrag() {
  const router = useRouter()
  const [, startTransition] = useTransition()

  return (
    <MidragSearchAction
      category="other"
      onSaved={() => startTransition(() => router.refresh())}
    />
  )
}
