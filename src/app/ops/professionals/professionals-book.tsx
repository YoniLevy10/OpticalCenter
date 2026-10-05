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

export type ProfessionalJob = {
  title: string
  store: string
  status: string
}

export function ProfessionalsBook({
  professionals,
  jobs,
}: {
  professionals: Professional[]
  jobs: Record<string, ProfessionalJob[]>
}) {
  const router = useRouter()
  const toast = useToast()
  const [pending, startTransition] = useTransition()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const [ratings, setRatings] = useState<Record<string, number>>({})

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

  async function rate(id: string, score: number) {
    setRatings((current) => ({ ...current, [id]: score }))
    try {
      const res = await fetch(`/api/professionals/${id}/rate`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ rating: score }),
      })
      if (!res.ok) toast.push({ title: 'הדירוג לא נשמר', tone: 'critical' })
    } catch {
      toast.push({ title: 'הדירוג לא נשמר', tone: 'critical' })
    }
  }

  return (
    <ul className="divide-y divide-border">
      {professionals.map((p) => {
        const tel = dialHref(p.phone)
        return (
          <li
            key={p.id}
            className="flex flex-wrap items-center justify-between gap-3 px-4 py-4"
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
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="min-h-[44px]"
                onClick={() => setOpenId(openId === p.id ? null : p.id)}
              >
                פרטים
              </Button>
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
            {openId === p.id ? (
              <div className="space-y-2 border-t border-border pt-3 sm:basis-full">
                <p className="t-meta text-ink-2">דירוג פנימי</p>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((score) => {
                    const value = ratings[p.id] ?? p.internal_rating ?? 0
                    return (
                      <button
                        key={score}
                        type="button"
                        className="t-body text-ink"
                        aria-label={`${score} מתוך 5`}
                        onClick={() => void rate(p.id, score)}
                      >
                        {score <= value ? '★' : '☆'}
                      </button>
                    )
                  })}
                </div>
                {(jobs[p.id] ?? []).length === 0 ? (
                  <p className="t-meta text-ink-3">עדיין אין עבודות שמשויכות לשם הזה.</p>
                ) : (
                  <ul className="space-y-1">
                    {(jobs[p.id] ?? []).map((job) => (
                      <li key={`${job.store}-${job.title}`} className="t-meta text-ink-2">
                        {job.store} · {job.title} · {job.status}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}
