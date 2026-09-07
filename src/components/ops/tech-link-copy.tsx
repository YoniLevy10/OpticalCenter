'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { techHref } from '@/lib/tech-href'

const TECH_ROLES = new Set(['internal_technician', 'external_provider'])

export function TechFieldLinkCopy({
  userId,
  role,
}: {
  userId: string
  role: string
}) {
  const [copied, setCopied] = useState(false)

  if (!TECH_ROLES.has(role)) return null

  const origin =
    typeof window !== 'undefined' ? window.location.origin : ''
  // Always include techId so HQ field-links open the correct personal queue
  // (logged-in technicians still resolve via session actor.id).
  const path = techHref('/tech', userId)
  const url = origin ? `${origin}${path}` : path

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" variant="secondary" size="sm" onClick={() => void copy()}>
        {copied ? (
          <Check className="h-4 w-4" aria-hidden />
        ) : (
          <Copy className="h-4 w-4" aria-hidden />
        )}
        {copied ? 'הועתק' : 'העתק קישור שטח'}
      </Button>
      <span className="t-caption t-num max-w-[12rem] truncate text-ink-3" dir="ltr">
        {url}
      </span>
    </div>
  )
}
