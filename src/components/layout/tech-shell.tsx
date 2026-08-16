import Link from 'next/link'
import { techHref } from '@/lib/tech-href'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { LogoutButton } from '@/components/auth/logout-button'

/**
 * The technician is a field worker on a phone, often one-handed, often with bad
 * signal. This shell is deliberately NOT the HQ shell:
 *
 *  - no HQ navigation of any kind
 *  - no bottom tab bar (there is only one destination — the job list)
 *  - the primary action is sticky at the thumb, not buried in a sidebar
 */

export function TechShell({
  children,
  title,
  subtitle,
  backHref,
  eyebrow,
  actions,
}: {
  children: React.ReactNode
  title: string
  subtitle?: React.ReactNode
  backHref?: string
  eyebrow?: string
  /** Sticky bottom action zone — the next thing the technician must do. */
  actions?: React.ReactNode
}) {
  return (
    <div className="dvh-screen bg-canvas text-ink">
      <header className="safe-pt sticky top-0 z-20 border-b border-border bg-surface/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-xl items-start gap-2.5 px-4 py-3.5">
          {backHref ? (
            <Link
              href={backHref}
              aria-label="חזרה"
              className="-ms-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] text-ink-2 transition-all duration-[var(--dur-1)] active:scale-90 hover:bg-surface-sunken/60"
            >
              {/* Chevron points toward the start edge; mirrors under RTL. */}
              <ChevronRight className="h-5 w-5 rtl:rotate-0 ltr:rotate-180" />
            </Link>
          ) : null}
          <div className="min-w-0 flex-1">
            <p className="t-caption text-ink-3">{eyebrow ?? 'MaintainOS · טכנאי'}</p>
            <h1 className="t-title mt-0.5 truncate text-ink">{title}</h1>
            {subtitle ? (
              <div className="t-meta mt-0.5 truncate text-ink-2">{subtitle}</div>
            ) : null}
          </div>
          <LogoutButton className="shrink-0" />
        </div>
      </header>

      <main
        className={cn(
          'mx-auto w-full max-w-xl px-4 pt-4',
          actions ? 'pb-actions' : 'pb-8',
        )}
      >
        {children}
      </main>

      {actions ? (
        <div
          className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface/90 backdrop-blur-md px-4 pt-3"
          style={{ paddingBottom: 'calc(var(--safe-b) + 12px)' }}
        >
          <div className="mx-auto max-w-xl">{actions}</div>
        </div>
      ) : null}
    </div>
  )
}

export { techHref }
