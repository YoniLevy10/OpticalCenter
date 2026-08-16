'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { Ellipsis, Inbox, Store, Wrench } from 'lucide-react'
import { BottomSheet } from '@/components/ui/overlay'
import { cn } from '@/lib/utils'

/**
 * Operational Quiet shell.
 *
 * Desktop: a 216px canvas-coloured sidebar separated by a hairline. It should
 * read as absence, not as a panel — no dark chrome, no elevation.
 * Mobile: a 3-slot bottom navigation, the third being More (a sheet), so tools
 * and settings never consume premium navigation space.
 *
 * Only working destinations are exposed. Reports was removed; the simulator and
 * settings live behind More.
 */

const PRIMARY = [
  { href: '/ops/tickets', label: 'תקלות', icon: Inbox, match: '/ops/tickets' },
  { href: '/ops/stores', label: 'חנויות', icon: Store, match: '/ops/stores' },
]

const TOOLS = [
  { href: '/ops/settings', label: 'הגדרות' },
  { href: '/ops/simulator', label: 'סימולטור WhatsApp' },
  { href: '/tech', label: 'פורטל טכנאי' },
]

function isActive(pathname: string, match: string) {
  return pathname === match || pathname.startsWith(`${match}/`)
}

function TenantMark() {
  return (
    <span
      aria-hidden
      className="t-caption inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--tenant)] font-semibold text-[var(--tenant-contrast)]"
    >
      OC
    </span>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? ''
  const [moreOpen, setMoreOpen] = useState(false)

  return (
    <div className="dvh-screen bg-canvas text-ink">
      {/* ---------- Desktop sidebar ---------- */}
      <aside
        className="fixed inset-block-0 bottom-0 top-0 z-30 hidden flex-col border-border bg-canvas start-0 border-e md:flex"
        style={{ width: 'var(--nav-w)' }}
      >
        <div
          className="flex items-center gap-2 px-4"
          style={{ height: 'var(--topbar-h)' }}
        >
          <TenantMark />
          <div className="min-w-0">
            <p className="t-body-strong truncate text-ink">MaintainOS</p>
          </div>
        </div>

        <nav className="flex-1 px-2 py-2">
          <ul className="space-y-0.5">
            {PRIMARY.map((item) => {
              const active = isActive(pathname, item.match)
              const Icon = item.icon
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      't-control relative flex h-9 items-center gap-2.5 rounded-[var(--radius-md)] px-2.5 transition-colors duration-[var(--dur-1)]',
                      active
                        ? 'bg-surface text-ink shadow-[var(--shadow-1)]'
                        : 'text-ink-2 hover:bg-surface/70 hover:text-ink',
                    )}
                  >
                    {/* Active indicator — one of the three sanctioned tenant uses. */}
                    <span
                      aria-hidden
                      className={cn(
                        'absolute inset-block-2 w-[2px] rounded-full start-0',
                        active ? 'bg-[var(--tenant)]' : 'bg-transparent',
                      )}
                    />
                    <Icon className="h-4 w-4 shrink-0" aria-hidden />
                    {item.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="border-t border-border p-2">
          <p className="t-caption px-2.5 pb-1.5 text-ink-3">כלים</p>
          <ul className="space-y-0.5">
            {TOOLS.map((t) => (
              <li key={t.href}>
                <Link
                  href={t.href}
                  className={cn(
                    't-meta flex h-8 items-center rounded-[var(--radius-md)] px-2.5 transition-colors',
                    isActive(pathname, t.href)
                      ? 'text-ink'
                      : 'text-ink-3 hover:text-ink-2',
                  )}
                >
                  {t.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex items-center gap-2 px-2.5 py-2">
            <span
              aria-hidden
              className="h-1.5 w-1.5 rounded-full bg-[var(--signal-resolved)]"
            />
            <span className="t-caption truncate text-ink-3">
              Optical Center · ישראל
            </span>
          </div>
        </div>
      </aside>

      {/* ---------- Mobile top bar ---------- */}
      <header className="safe-pt sticky top-0 z-30 border-b border-border bg-surface/92 backdrop-blur-sm md:hidden">
        <div
          className="flex items-center gap-2 px-4"
          style={{ height: 'var(--topbar-h)' }}
        >
          <TenantMark />
          <p className="t-body-strong text-ink">MaintainOS</p>
          <span className="t-caption ms-auto text-ink-3">ישראל</span>
        </div>
      </header>

      {/* ---------- Content ---------- */}
      <div className="md:ps-[var(--nav-w)]">
        <main className="pb-nav mx-auto w-full max-w-[1400px] px-4 pt-4 md:px-6 md:pt-6">
          {children}
        </main>
      </div>

      {/* ---------- Mobile bottom navigation ---------- */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 backdrop-blur-sm md:hidden"
        style={{ paddingBottom: 'var(--safe-b)' }}
      >
        <ul className="flex" style={{ height: 'var(--bottomnav-h)' }}>
          {PRIMARY.map((item) => {
            const active = isActive(pathname, item.match)
            const Icon = item.icon
            return (
              <li key={item.href} className="flex-1">
                <Link
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex h-full flex-col items-center justify-center gap-1 transition-colors',
                    active ? 'text-[var(--tenant)]' : 'text-ink-3',
                  )}
                >
                  <Icon className="h-5 w-5" aria-hidden />
                  <span className="t-caption">{item.label}</span>
                </Link>
              </li>
            )
          })}
          <li className="flex-1">
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              className="flex h-full w-full flex-col items-center justify-center gap-1 text-ink-3 transition-colors"
            >
              <Ellipsis className="h-5 w-5" aria-hidden />
              <span className="t-caption">עוד</span>
            </button>
          </li>
        </ul>
      </nav>

      <BottomSheet
        open={moreOpen}
        onOpenChange={setMoreOpen}
        title="כלים והגדרות"
      >
        <ul className="divide-y divide-border">
          {TOOLS.map((t) => (
            <li key={t.href}>
              <Link
                href={t.href}
                onClick={() => setMoreOpen(false)}
                className="t-body flex min-h-[var(--tap)] items-center gap-2.5 text-ink"
              >
                <Wrench className="h-4 w-4 text-ink-3" aria-hidden />
                {t.label}
              </Link>
            </li>
          ))}
        </ul>
        <p className="t-caption mt-4 text-ink-3">
          Optical Center · פיילוט ישראל
        </p>
      </BottomSheet>
    </div>
  )
}
