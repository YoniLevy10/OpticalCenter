import Link from 'next/link'
import { ArrowDown, ArrowUp } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Desktop density. Rows are `--row-h` tall, hairline-separated, with the whole
 * row acting as a hit target via a stretched link on the primary cell.
 */

export function Table({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <table className={cn('w-full border-collapse', className)}>{children}</table>
  )
}

export function THead({ children }: { children: React.ReactNode }) {
  return (
    <thead>
      <tr className="border-b border-border bg-sunken/50">{children}</tr>
    </thead>
  )
}

export function TH({
  children,
  className,
  align = 'start',
  sort,
}: {
  children: React.ReactNode
  className?: string
  align?: 'start' | 'end'
  /** When present the header becomes a sort control. */
  sort?: { href: string; active: boolean; direction: 'asc' | 'desc' }
}) {
  const Icon = sort?.direction === 'asc' ? ArrowUp : ArrowDown
  return (
    <th
      scope="col"
      className={cn(
        't-caption h-9 px-3 font-medium text-ink-3',
        align === 'end' ? 'text-end' : 'text-start',
        className,
      )}
    >
      {sort ? (
        <Link
          href={sort.href}
          className={cn(
            'inline-flex items-center gap-1 transition-colors hover:text-ink',
            sort.active && 'text-ink',
          )}
        >
          {children}
          {sort.active ? <Icon className="h-3 w-3" aria-hidden /> : null}
        </Link>
      ) : (
        children
      )}
    </th>
  )
}

export function TBody({ children }: { children: React.ReactNode }) {
  return <tbody>{children}</tbody>
}

export function TR({
  children,
  className,
  edgeClass,
}: {
  children: React.ReactNode
  className?: string
  /** Priority leading edge, applied via the `.edge` pseudo-element. */
  edgeClass?: string
}) {
  return (
    <tr
      className={cn(
        'group border-b border-border/70 transition-colors duration-[var(--dur-1)] hover:bg-canvas focus-within:bg-canvas',
        edgeClass,
        className,
      )}
      style={{ height: 'var(--row-h)' }}
    >
      {children}
    </tr>
  )
}

export function TD({
  children,
  className,
  align = 'start',
}: {
  children: React.ReactNode
  className?: string
  align?: 'start' | 'end'
}) {
  return (
    <td
      className={cn(
        'px-3 align-middle',
        align === 'end' ? 'text-end' : 'text-start',
        className,
      )}
    >
      {children}
    </td>
  )
}

/** Makes the entire row clickable without nesting interactive elements. */
export function RowLink({
  href,
  children,
  label,
}: {
  href: string
  children: React.ReactNode
  label?: string
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none"
    >
      {children}
    </Link>
  )
}
