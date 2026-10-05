'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { RefreshCw } from 'lucide-react'
import { usePhrase } from '@/components/i18n/locale-provider'
import { Button } from '@/components/ui/button'

export function RefreshButton({
  onRefresh,
  label = 'רענון',
}: {
  onRefresh?: () => void | Promise<void>
  label?: string
}) {
  const router = useRouter()
  const p = usePhrase()
  const text = p(label)
  const [pending, startTransition] = useTransition()
  const [busy, setBusy] = useState(false)

  function handleClick() {
    startTransition(async () => {
      setBusy(true)
      try {
        if (onRefresh) await onRefresh()
        else router.refresh()
      } finally {
        setBusy(false)
      }
    })
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="touch"
      aria-label={text}
      aria-busy={pending || busy}
      disabled={pending || busy}
      onClick={handleClick}
      className="shrink-0 px-2"
    >
      <RefreshCw
        className={`h-4 w-4 ${pending || busy ? 'animate-spin' : ''}`}
        aria-hidden
      />
    </Button>
  )
}
