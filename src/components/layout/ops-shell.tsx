import Link from 'next/link'
import { cn } from '@/lib/utils'

const PRIMARY_NAV = [
  { href: '/ops', label: 'סקירה', match: (p: string) => p === '/ops' },
  {
    href: '/ops/tickets',
    label: 'תקלות',
    match: (p: string) => p.startsWith('/ops/tickets'),
  },
  {
    href: '/ops/stores',
    label: 'חנויות',
    match: (p: string) => p.startsWith('/ops/stores'),
  },
  {
    href: '/ops/reports',
    label: 'דוחות',
    match: (p: string) => p.startsWith('/ops/reports'),
  },
  {
    href: '/ops/settings',
    label: 'הגדרות',
    match: (p: string) => p.startsWith('/ops/settings'),
  },
]

export function OpsShell({
  children,
  title,
  subtitle,
  actions,
  pathname = '/ops',
}: {
  children: React.ReactNode
  title: string
  subtitle?: string
  actions?: React.ReactNode
  pathname?: string
}) {
  return (
    <div className="min-h-screen bg-canvas text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-surface/95 backdrop-blur">
        <div className="mx-auto flex h-12 max-w-7xl items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-6">
            <Link href="/ops" className="flex items-center gap-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-[6px] bg-accent text-[10px] font-semibold text-white">
                OC
              </span>
              <span className="text-[13px] font-semibold tracking-tight">
                MaintainOS
              </span>
            </Link>
            <nav className="hidden items-center gap-0.5 md:flex">
              {PRIMARY_NAV.map((item) => {
                const active = item.match(pathname)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'rounded-[var(--radius-md)] px-2.5 py-1.5 text-[13px] transition-colors',
                      active
                        ? 'bg-accent-soft text-accent'
                        : 'text-muted hover:bg-canvas hover:text-foreground',
                    )}
                  >
                    {item.label}
                  </Link>
                )
              })}
            </nav>
          </div>
          <div className="text-[11px] text-faint">Optical Center · ישראל</div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-5 pb-20 md:pb-5">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-[21px] font-semibold tracking-tight">{title}</h1>
            {subtitle ? (
              <p className="mt-1 text-[13px] text-muted">{subtitle}</p>
            ) : null}
          </div>
          {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
        </div>
        {children}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border bg-surface md:hidden">
        {PRIMARY_NAV.slice(0, 4).map((item) => {
          const active = item.match(pathname)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex-1 py-3 text-center text-[11px]',
                active ? 'text-accent' : 'text-muted',
              )}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
