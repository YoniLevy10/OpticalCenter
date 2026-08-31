'use client'

import { Moon, Sun, Sunset } from 'lucide-react'
import { useTheme } from '@/components/theme/theme-provider'
import { cn } from '@/lib/utils'
import type { ThemePreference } from '@/lib/theme'

const OPTIONS: {
  id: ThemePreference
  label: string
  hint: string
  icon: typeof Sun
}[] = [
  { id: 'light', label: 'בהיר', hint: 'תמיד בהיר', icon: Sun },
  { id: 'dark', label: 'כהה', hint: 'תמיד כהה', icon: Moon },
  {
    id: 'auto',
    label: 'אוטומטי',
    hint: 'כהה בלילה (19:00–07:00)',
    icon: Sunset,
  },
]

export function ThemeToggle({
  className,
  compact = false,
}: {
  className?: string
  /** Icon-sized control for headers / sidebars */
  compact?: boolean
}) {
  const { preference, setPreference, resolvedDark } = useTheme()

  if (compact) {
    const cycle: ThemePreference[] = ['auto', 'light', 'dark']
    const next = cycle[(cycle.indexOf(preference) + 1) % cycle.length]!
    const Icon =
      preference === 'dark' ? Moon : preference === 'light' ? Sun : Sunset
    const label =
      preference === 'auto'
        ? `ערכת נושא אוטומטית (${resolvedDark ? 'כהה עכשיו' : 'בהיר עכשיו'})`
        : preference === 'dark'
          ? 'ערכת נושא כהה'
          : 'ערכת נושא בהירה'

    return (
      <button
        type="button"
        onClick={() => setPreference(next)}
        aria-label={`${label}. לחצו להחלפה`}
        title={label}
        className={cn(
          'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] text-ink-2 transition-colors hover:bg-surface-sunken hover:text-ink',
          className,
        )}
      >
        <Icon className="h-4 w-4" aria-hidden />
      </button>
    )
  }

  return (
    <fieldset className={cn('space-y-2', className)}>
      <legend className="t-section text-ink">ערכת נושא</legend>
      <p className="t-caption text-ink-3">
        מצב אוטומטי עובר לכהה לפי השעון המקומי (19:00–07:00) — נוח יותר בלילה.
      </p>
      <div
        role="radiogroup"
        aria-label="ערכת נושא"
        className="grid grid-cols-3 gap-2"
      >
        {OPTIONS.map((opt) => {
          const Icon = opt.icon
          const selected = preference === opt.id
          return (
            <button
              key={opt.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setPreference(opt.id)}
              className={cn(
                'flex flex-col items-start gap-1 rounded-[var(--radius-md)] border px-3 py-2.5 text-start transition-colors',
                selected
                  ? 'border-[var(--tenant-line)] bg-[var(--tenant-soft)] text-[var(--tenant)]'
                  : 'border-border bg-surface text-ink-2 hover:bg-surface-sunken hover:text-ink',
              )}
            >
              <Icon className="h-4 w-4" aria-hidden />
              <span className="t-body-strong">{opt.label}</span>
              <span className="t-caption opacity-80">{opt.hint}</span>
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}

/** Compact control styled for the dark desktop sidebar. */
export function ThemeToggleOnDark({ className }: { className?: string }) {
  const { preference, setPreference, resolvedDark } = useTheme()
  const cycle: ThemePreference[] = ['auto', 'light', 'dark']
  const next = cycle[(cycle.indexOf(preference) + 1) % cycle.length]!
  const Icon =
    preference === 'dark' ? Moon : preference === 'light' ? Sun : Sunset
  const label =
    preference === 'auto'
      ? `ערכת נושא אוטומטית (${resolvedDark ? 'כהה' : 'בהיר'})`
      : preference === 'dark'
        ? 'כהה'
        : 'בהיר'

  return (
    <button
      type="button"
      onClick={() => setPreference(next)}
      aria-label={`ערכת נושא: ${label}. לחצו להחלפה`}
      title={`ערכת נושא: ${label}`}
      className={cn(
        'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] text-white/70 transition-colors hover:bg-white/10 hover:text-white',
        className,
      )}
    >
      <Icon className="h-4 w-4" aria-hidden />
    </button>
  )
}
