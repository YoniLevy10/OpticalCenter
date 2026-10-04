'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Notice, Panel } from '@/components/ui/primitives'
import { PhoneCallLink } from '@/components/ui/phone-call-link'
import { useToast } from '@/components/ui/toast'
import { MidragSearchAction } from '@/components/ops/midrag-search-action'
import { externalSearchCaption } from '@/modules/vendors/external-search'

type Match = {
  id: string
  name: string
  specialties: string
  preferred?: boolean
  coverage_regions?: string[]
  contact_phone?: string | null
  notes?: string | null
  score: number
  reason: string
}

type Pro = {
  id: string
  full_name: string
  phone: string | null
  trade: string | null
  use_count: number
  notes: string | null
}

export function PreferredVendorsPanel({
  ticketId,
  category,
  regionId,
  city,
  initialMatches,
}: {
  ticketId: string
  category: string
  regionId: string
  city?: string | null
  initialMatches?: Match[]
}) {
  const toast = useToast()
  const [matches, setMatches] = useState<Match[]>(initialMatches ?? [])
  const [pros, setPros] = useState<Pro[]>([])
  const [loading, setLoading] = useState(!initialMatches)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const searchCaption = externalSearchCaption({ category, city })

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!initialMatches) setLoading(true)
      try {
        const qs = new URLSearchParams({ category, regionId })
        const [suggestRes, prosRes] = await Promise.all([
          initialMatches
            ? Promise.resolve(null)
            : fetch(`/api/vendors/suggest?${qs}`),
          fetch('/api/professionals'),
        ])
        if (cancelled) return
        if (suggestRes) {
          const json = await suggestRes.json()
          if (!suggestRes.ok) throw new Error(json.error || 'טעינה נכשלה')
          setMatches((json.matches ?? []).slice(0, 4))
        } else {
          setMatches(initialMatches ?? [])
        }
        if (prosRes.ok) {
          const pj = await prosRes.json()
          setPros((pj.professionals ?? []).slice(0, 8))
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'שגיאה')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [category, regionId, initialMatches])

  async function dispatch(vendorId: string) {
    setBusyId(vendorId)
    try {
      const res = await fetch('/api/partner/dispatch', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ticketId,
          vendorId,
          idempotencyKey: `pref-${ticketId}-${vendorId}`,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'שיגור נכשל')
      toast.push({ title: 'שוגר לספק מועדף', tone: 'success' })
    } catch (e) {
      toast.push({
        title: e instanceof Error ? e.message : 'שיגור נכשל',
        tone: 'critical',
      })
    } finally {
      setBusyId(null)
    }
  }

  async function onCallPro(id: string) {
    try {
      await fetch(`/api/professionals/${id}/touch`, { method: 'POST' })
    } catch {
      /* ranking best-effort */
    }
  }

  return (
    <Panel className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="t-body-strong text-ink">ספקים ואנשי מקצוע</h2>
        <Link href="/ops/vendors" className="t-caption text-ink-2 underline">
          מאגר ספקים
        </Link>
      </div>
      <p className="t-meta text-ink-2">
        מאגר מועדפים + אנשי קשר ששמרתם ממידרג (מדורגים לפי שימוש).
      </p>

      {pros.length > 0 ? (
        <div className="space-y-2">
          <h3 className="t-caption text-ink-2">אנשי מקצוע שמורים</h3>
          <ul className="divide-y divide-border rounded-[var(--radius-md)] border border-border">
            {pros.map((p) => (
              <li
                key={p.id}
                className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="t-body-strong text-ink">{p.full_name}</p>
                  <p className="t-meta text-ink-2">
                    {p.trade ?? 'כללי'}
                    {p.use_count ? ` · ${p.use_count} פניות` : ''}
                    {p.notes ? ` · ${p.notes}` : ''}
                  </p>
                </div>
                {p.phone ? (
                  <span onClick={() => void onCallPro(p.id)}>
                    <PhoneCallLink phone={p.phone} label="חיוג" />
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {loading ? (
        <p className="t-body text-ink-2">טוען התאמות…</p>
      ) : error && matches.length === 0 ? (
        <Notice tone="critical">{error}</Notice>
      ) : matches.length === 0 ? (
        <Notice tone="warning">
          אין ספק מועדף בקטגוריה זו — חפשו במידרג למטה ושמרו איש מקצוע.
        </Notice>
      ) : (
        <ul className="divide-y divide-border">
          {matches.map((m) => (
            <li
              key={m.id}
              className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="t-body-strong text-ink">{m.name}</p>
                <p className="t-meta text-ink-2">
                  {m.reason}
                  {m.notes ? ` · ${m.notes}` : ''}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {m.contact_phone ? (
                  <PhoneCallLink phone={m.contact_phone} label="חיוג" />
                ) : null}
                <Button
                  type="button"
                  variant="secondary"
                  size="touch"
                  disabled={busyId === m.id}
                  onClick={() => void dispatch(m.id)}
                >
                  {busyId === m.id ? 'משגר…' : 'שגר לספק'}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-2 border-t border-border pt-3">
        <p className="t-meta text-ink-2">{searchCaption}</p>
        <MidragSearchAction category={category} city={city} />
      </div>
    </Panel>
  )
}
