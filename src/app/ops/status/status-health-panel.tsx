'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, AlertTriangle, CircleAlert } from 'lucide-react'
import { Panel, PanelHeader } from '@/components/ui/primitives'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type Level = 'ok' | 'partial' | 'issue' | 'unknown'

type HealthPayload = {
  ok?: boolean
  status?: string
  backend?: string
  checks?: Record<string, { ok?: boolean; message?: string }>
}

type PilotCheck = {
  id: string
  ok: boolean
  level: string
  message: string
  owner: string
}

type PilotPayload = {
  ok?: boolean
  buildSideReady?: boolean
  metaSideReady?: boolean
  readyForPilot?: boolean
  checks?: PilotCheck[]
  nextSteps?: Array<{ id: string; owner: string; message: string }>
}

function levelFrom(data: HealthPayload | null, pilot: PilotPayload | null): Level {
  if (!data) return 'unknown'
  if (data.ok === false) return 'issue'
  if (pilot && pilot.readyForPilot === false) {
    if (pilot.buildSideReady === false) return 'issue'
    return 'partial'
  }
  const checks = data.checks ? Object.values(data.checks) : []
  if (checks.some((c) => c.ok === false)) return 'partial'
  if (data.ok === true) return 'ok'
  return 'ok'
}

const COPY: Record<
  Level,
  { title: string; detail: string; icon: typeof CheckCircle2; text: string }
> = {
  ok: {
    title: 'הכול עובד',
    detail: 'המערכת תקינה.',
    icon: CheckCircle2,
    text: 'text-[var(--signal-resolved)]',
  },
  partial: {
    title: 'מצב חלקי',
    detail: 'חלק מהשירותים דורשים תשומת לב.',
    icon: AlertTriangle,
    text: 'text-[var(--signal-warning)]',
  },
  issue: {
    title: 'תקלה',
    detail: 'זוהתה תקלה שעלולה להשפיע על העבודה.',
    icon: CircleAlert,
    text: 'text-[var(--signal-critical)]',
  },
  unknown: {
    title: 'בודקים…',
    detail: 'ממתינים לתשובת המערכת.',
    icon: AlertTriangle,
    text: 'text-ink-2',
  },
}

export function StatusHealthPanel() {
  const [level, setLevel] = useState<Level>('unknown')
  const [backend, setBackend] = useState<string | null>(null)
  const [pilot, setPilot] = useState<PilotPayload | null>(null)
  const [checking, setChecking] = useState(false)

  async function refresh() {
    setChecking(true)
    try {
      const [healthRes, pilotRes] = await Promise.all([
        fetch('/api/health'),
        fetch('/api/health/pilot'),
      ])
      const data = (await healthRes.json()) as HealthPayload
      const pilotData = (await pilotRes.json()) as PilotPayload
      setPilot(pilotData)
      setLevel(levelFrom(healthRes.ok ? data : { ok: false }, pilotData))
      setBackend(data.backend ?? null)
    } catch {
      setLevel('issue')
      setBackend(null)
      setPilot(null)
    } finally {
      setChecking(false)
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  const copy = COPY[level]
  const Icon = copy.icon
  const openSteps = pilot?.nextSteps ?? []

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={checking}
          onClick={() => void refresh()}
        >
          {checking ? 'בודק…' : 'בדיקה מחדש'}
        </Button>
      </div>

      <div
        role="status"
        className="flex items-start gap-3 rounded-[var(--radius-lg)] border border-border bg-surface px-4 py-4"
      >
        <Icon
          className={cn('mt-0.5 h-5 w-5 shrink-0', copy.text)}
          strokeWidth={1.75}
        />
        <div>
          <p className={cn('t-section', copy.text)}>{copy.title}</p>
          <p className="t-body mt-1 text-ink-2">{copy.detail}</p>
          {backend ? (
            <p className="t-caption mt-2 text-ink-3">
              {backend === 'supabase' ? 'מחובר' : 'דמו מקומי'}
            </p>
          ) : null}
        </div>
      </div>

      {openSteps.length > 0 ? (
        <Panel flush elevated>
          <PanelHeader title="חסר לפיילוט חנויות" />
          <ul className="divide-y divide-border px-4 py-2">
            {openSteps.map((s) => (
              <li key={s.id} className="py-2">
                <p className="t-caption text-ink-3">
                  {s.owner === 'meta'
                    ? 'Meta / מספר'
                    : s.owner === 'build'
                      ? 'בנייה / DB'
                      : 'Ops'}
                </p>
                <p className="t-body text-ink">{s.message}</p>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}

      <Panel flush elevated>
        <PanelHeader title="מצבים" />
        <ul className="divide-y divide-border px-4 py-2">
          {(
            [
              ['ok', 'תקין'],
              ['partial', 'חלקי'],
              ['issue', 'תקלה'],
            ] as const
          ).map(([key, label]) => (
            <li
              key={key}
              className="flex min-h-10 items-center justify-between gap-3 py-2"
            >
              <span className="t-body text-ink">{label}</span>
              <span
                className={cn(
                  't-caption rounded-full px-2 py-0.5',
                  level === key
                    ? 'bg-[var(--tenant-soft)] text-[var(--tenant)]'
                    : 'text-ink-3',
                )}
              >
                {level === key ? 'נוכחי' : '—'}
              </span>
            </li>
          ))}
        </ul>
      </Panel>

      <p className="t-body text-ink-2">
        להגדרות WhatsApp ומספר עסקי:{' '}
        <Link
          href="/ops/settings"
          className="text-[var(--signal-progress)] hover:underline"
        >
          הגדרות
        </Link>
        {' · '}
        <Link
          href="/api/health/pilot"
          className="text-[var(--signal-progress)] hover:underline"
        >
          דוח מוכנות JSON
        </Link>
      </p>
    </div>
  )
}
