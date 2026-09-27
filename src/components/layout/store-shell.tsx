'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LogoutButton } from '@/components/auth/logout-button'
import { ThemeToggle } from '@/components/theme/theme-toggle'
import { BrandMark } from '@/components/brand/brand-mark'
import { cn } from '@/lib/utils'

export function StoreShell({
  children,
  storeName,
  storeCode,
}: {
  children: React.ReactNode
  storeName?: string
  storeCode?: string
}) {
  const pathname = usePathname() ?? ''

  const links = [
    { href: '/store', label: 'התקלות שלי', match: '/store' },
    { href: '/store/report', label: 'דיווח חדש', match: '/store/report' },
  ]

  return (
    <div className="ops-atmosphere dvh-screen text-ink">
      <header className="apple-glass safe-pt sticky top-0 z-20 border-b border-white/50">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <BrandMark size={32} className="rounded-[var(--radius-md)]" alt="" />
            <div className="min-w-0">
              <p className="t-body-strong truncate text-ink">Optical Center · חנות</p>
              {storeName ? (
                <p className="t-caption truncate text-ink-3">
                  {storeName}
                  {storeCode ? ` · #${storeCode}` : ''}
                </p>
              ) : null}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <ThemeToggle compact />
            <LogoutButton size="sm" variant="secondary" />
          </div>
        </div>
        <nav className="flex px-2">
          {links.map((item) => {
            const active =
              pathname === item.match || pathname.startsWith(`${item.match}/`)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'press-scale t-control mx-1 mb-2 flex-1 rounded-md py-2.5 text-center transition-colors',
                  active
                    ? 'bg-tenant-soft text-tenant'
                    : 'text-ink-3 hover:bg-[color-mix(in_srgb,var(--ink)_5%,transparent)] hover:text-ink',
                )}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>
      </header>
      <main
        id="main-content"
        className="safe-pb scroll-edge-fade mx-auto max-w-lg px-4 py-5"
      >
        {children}
      </main>
    </div>
  )
}
