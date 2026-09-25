'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Notice, Panel } from '@/components/ui/primitives'
import { useToast } from '@/components/ui/toast'
import {
  buildMidragCityPickerUrl,
  buildMidragGoogleBackupUrl,
  buildMidragSearchUrl,
  externalSearchCaption,
} from '@/modules/vendors/external-search'

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

export function PreferredVendorsPanel({
  ticketId,
  category,
  regionId,
  city,
  initialMatches,
  fixlyLabel: initialFixlyLabel,
}: {
  ticketId: string
  category: string
  regionId: string
  city?: string | null
  initialMatches?: Match[]
  fixlyLabel?: string
}) {
  const toast = useToast()
  const [matches, setMatches] = useState<Match[]>(initialMatches ?? [])
  const [fixlyLabel, setFixlyLabel] = useState(
    initialFixlyLabel ?? 'Fixly כבוי — מאגר ספקים מועדפים בלבד',
  )
  const [loading, setLoading] = useState(!initialMatches)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const searchInput = { category, city }
  const midragUrl = buildMidragSearchUrl(searchInput)
  const midragCityUrl = buildMidragCityPickerUrl(searchInput)
  const googleBackupUrl = buildMidragGoogleBackupUrl(searchInput)
  const searchCaption = externalSearchCaption(searchInput)

  useEffect(() => {
    if (initialMatches) {
      setMatches(initialMatches)
      setLoading(false)
      return
    }
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const qs = new URLSearchParams({
          category,
          regionId,
        })
        const res = await fetch(`/api/vendors/suggest?${qs}`)
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || 'טעינה נכשלה')
        if (cancelled) return
        setMatches((json.matches ?? []).slice(0, 4))
        setFixlyLabel(json.fixly?.label ?? 'Fixly כבוי')
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

  return (
    <Panel className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="t-body-strong text-ink">ספקים מועדפים באזור</h2>
        <Link href="/ops/vendors" className="t-caption text-ink-2 underline">
          מאגר ספקים
        </Link>
      </div>
      <p className="t-meta text-ink-2">{fixlyLabel}</p>
      {loading ? (
        <p className="t-body text-ink-2">טוען התאמות…</p>
      ) : error && matches.length === 0 ? (
        <Notice tone="critical">{error}</Notice>
      ) : matches.length === 0 ? (
        <Notice tone="warning">
          אין ספק מועדף בקטגוריה זו — חפשו במידרג למטה והוסיפו למאגר.
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
              <Button
                type="button"
                variant="secondary"
                size="touch"
                disabled={busyId === m.id}
                onClick={() => void dispatch(m.id)}
              >
                {busyId === m.id ? 'משגר…' : 'שגר לספק'}
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-2 border-t border-border pt-3">
        <p className="t-body-strong text-ink">חיפוש חיצוני · מידרג</p>
        <p className="t-meta text-ink-2">
          גיבוי כשאין ספק מועדף פנוי · {searchCaption} · נפתח בחלון חדש
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Button asChild variant="secondary" size="touch">
            <a
              href={midragUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="ms-1 h-4 w-4" aria-hidden />
              חיפוש במידרג
            </a>
          </Button>
          {midragCityUrl ? (
            <Button asChild variant="ghost" size="touch">
              <a
                href={midragCityUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                בחירת עיר במידרג
              </a>
            </Button>
          ) : null}
          <Button asChild variant="ghost" size="touch">
            <a
              href={googleBackupUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              גיבוי · Google
            </a>
          </Button>
        </div>
      </div>
    </Panel>
  )
}
