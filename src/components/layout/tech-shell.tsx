import Link from 'next/link'
import { cn } from '@/lib/utils'

export function TechShell({
  children,
  title,
  subtitle,
  techId,
  backHref,
}: {
  children: React.ReactNode
  title: string
  subtitle?: string
  techId?: string | null
  backHref?: string
}) {
  const listHref = techId
    ? `/tech?techId=${encodeURIComponent(techId)}`
    : '/tech'

  return (
    <div className="min-h-screen bg-canvas text-foreground">
      <header className="sticky top-0 z-20 border-b border-border bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-3">
          {backHref ? (
            <Link
              href={backHref}
              className="rounded-[var(--radius-md)] px-2 py-1 text-[13px] text-accent hover:bg-accent-soft"
            >
              חזרה
            </Link>
          ) : (
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-[6px] bg-accent text-[10px] font-semibold text-white">
              OC
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[11px] text-faint">MaintainOS · טכנאי</p>
            <h1 className="truncate text-[18px] font-semibold tracking-tight">
              {title}
            </h1>
            {subtitle ? (
              <p className="mt-0.5 truncate text-[12px] text-muted">{subtitle}</p>
            ) : null}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 pb-24 pt-4">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface">
        <div className="mx-auto flex max-w-lg">
          <Link
            href={listHref}
            className={cn(
              'flex-1 py-3.5 text-center text-[13px] font-medium text-accent',
            )}
          >
            העבודות
          </Link>
          <Link
            href="/ops/tickets"
            className="flex-1 py-3.5 text-center text-[13px] text-muted"
          >
            HQ
          </Link>
        </div>
      </nav>
    </div>
  )
}

export function techHref(path: string, techId?: string | null) {
  if (!techId) return path
  const sep = path.includes('?') ? '&' : '?'
  return `${path}${sep}techId=${encodeURIComponent(techId)}`
}
