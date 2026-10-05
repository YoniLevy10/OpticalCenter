'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Phone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import type { Professional } from '@/modules/professionals/types'
import { formatIsraeliPhoneDisplay } from '@/lib/phone'
import { cn } from '@/lib/utils'

function dialHref(phone: string | null | undefined): string | null {
  if (!phone?.trim()) return null
  const digits = phone.replace(/[^\d+]/g, '')
  if (!digits) return null
  return `tel:${digits}`
}

function usageLabel(count: number): string {
  if (count === 1) return 'שימוש אחד'
  return `${count} שימושים`
}

export function ProfessionalsBook({
  professionals,
}: {
  professionals: Professional[]
}) {
  const router = useRouter()
  const toast = useToast()
  const [pending, startTransition] = useTransition()
  const [busyId, setBusyId] = useState<string | null>(null)

  async function touch(id: string) {
    setBusyId(id)
    try {
      await fetch(`/api/professionals/${id}/touch`, {
        method: 'POST',
        credentials: 'same-origin',
      })
      startTransition(() => router.refresh())
    } catch {
      toast.push({ title: 'לא עודכן דירוג', tone: 'critical' })
    } finally {
      setBusyId(null)
    }
  }

  return (
    <ul className="divide-y divide-border">
      {professionals.map((p) => {
        const tel = dialHref(p.phone)
        return (
          <li
            key={p.id}
            className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0 space-y-1">
              <p className="t-lead font-semibold text-ink">{p.full_name}</p>
              <p className="t-meta text-ink-2">
                {[p.trade, p.company_name].filter(Boolean).join(' · ') ||
                  'איש מקצוע ממידרג'}
              </p>
              <p className="t-caption text-ink-3">
                {p.use_count > 0 ? usageLabel(p.use_count) : 'נשמר לאחרונה'}
                {p.phone ? ` · ${formatIsraeliPhoneDisplay(p.phone)}` : ''}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              {tel ? (
                <Button
                  asChild
                  variant="primary"
                  size="sm"
                  className="min-h-[44px]"
                  disabled={pending || busyId === p.id}
                >
                  <a
                    href={tel}
                    aria-label={`התקשר אל ${p.full_name}`}
                    onClick={() => void touch(p.id)}
                    className="inline-flex items-center gap-2"
                  >
                    <Phone className="h-3.5 w-3.5" aria-hidden />
                    התקשר
                  </a>
                </Button>
              ) : (
                <span className={cn('t-caption text-ink-3')}>אין טלפון</span>
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
