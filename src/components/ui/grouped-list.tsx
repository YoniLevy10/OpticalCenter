'use client'

import { usePhrase } from '@/components/i18n/locale-provider'
import { cn } from '@/lib/utils'

/**
 * iOS Settings-style inset grouped list. Sits on sunken canvas; rows are
 * opaque surface with hairline separators — not cards, not glass.
 */
export function GroupedSection({
  title,
  footer,
  children,
  className,
}: {
  title?: string
  footer?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  const p = usePhrase()
  return (
    <section className={cn('flex flex-col gap-2', className)}>
      {title ? (
        <h2 className="t-caption px-4 text-ink-3 md:px-1">{p(title)}</h2>
      ) : null}
      <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border/80 bg-surface">
        <div className="divide-y divide-border">{children}</div>
      </div>
      {footer ? (
        <p className="t-caption px-4 text-ink-3 md:px-1">
          {typeof footer === 'string' ? p(footer) : footer}
        </p>
      ) : null}
    </section>
  )
}

export function GroupedRow({
  children,
  className,
  as: Comp = 'div',
}: {
  children: React.ReactNode
  className?: string
  as?: 'div' | 'label' | 'li'
}) {
  return (
    <Comp className={cn('flex min-h-[var(--tap)] items-center gap-3 px-4 py-3', className)}>
      {children}
    </Comp>
  )
}

export function GroupedList({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-6 rounded-[var(--radius-xl)] bg-surface-sunken/60 px-3 py-4 md:px-4',
        className,
      )}
    >
      {children}
    </div>
  )
}
