import { formatIls } from '@/modules/spend/true-cost'
import type { ValueBar } from '@/modules/pilot/story'

export function ValueBars({
  title,
  bars,
}: {
  title: string
  bars: ValueBar[]
}) {
  const max = Math.max(...bars.map((bar) => bar.amount), 1)
  if (bars.length === 0) {
    return (
      <figure className="flex flex-col gap-2">
        <figcaption className="t-section text-ink">{title}</figcaption>
        <p className="t-body text-ink-2">עדיין אין סכומים לגרף.</p>
      </figure>
    )
  }
  return (
    <figure className="flex flex-col gap-3">
      <figcaption className="t-section text-ink">{title}</figcaption>
      <ul className="flex flex-col gap-3">
        {bars.map((bar) => (
          <li key={bar.label} className="grid grid-cols-[5.5rem_1fr_auto] items-center gap-3">
            <span className="t-meta truncate text-ink-2">{bar.label}</span>
            <span className="h-3 overflow-hidden rounded-full bg-surface-sunken">
              <span
                className="block h-full rounded-full bg-[var(--tenant)]"
                style={{
                  width:
                    bar.amount <= 0
                      ? '0%'
                      : `${Math.max(4, Math.round((bar.amount / max) * 100))}%`,
                }}
              />
            </span>
            <span className="t-meta t-num text-ink">{formatIls(bar.amount)}</span>
          </li>
        ))}
      </ul>
    </figure>
  )
}
