'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LogoutButton } from '@/components/auth/logout-button'
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
    <div className="dvh-screen bg-canvas text-ink">
      <header className="safe-pt border-b border-border bg-surface shadow-[var(--shadow-1)]">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="t-body-strong truncate text-ink">MaintainOS · חנות</p>
            {storeName ? (
              <p className="t-caption truncate text-ink-3">
                {storeName}
                {storeCode ? ` · #${storeCode}` : ''}
              </p>
            ) : null}
          </div>
          <LogoutButton size="sm" variant="secondary" />
        </div>
        <nav className="flex border-t border-border">
          {links.map((item) => {
            const active =
              pathname === item.match || pathname.startsWith(`${item.match}/`)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  't-control flex-1 py-3 text-center transition-colors',
                  active
                    ? 'border-b-2 border-[var(--tenant)] text-[var(--tenant)]'
                    : 'text-ink-3 hover:text-ink',
                )}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>
      </header>
      <main id="main-content" className="safe-pb mx-auto max-w-lg px-4 py-5">
        {children}
      </main>
    </div>
  )
}
