'use client'

import Link from 'next/link'
import { useState } from 'react'
import {
  LayoutDashboard,
  Ticket,
  Store,
  MoreHorizontal,
  BarChart3,
  Settings,
  Wrench,
  Smartphone,
  FlaskConical,
  LogIn,
  Search,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Drawer } from '@/components/ui/overlay'
import { Input } from '@/components/ui/input'

const SIDEBAR = [
  { href: '/ops', label: 'סקירה', match: (p: string) => p === '/ops', icon: LayoutDashboard },
  {
    href: '/ops/tickets',
    label: 'תקלות',
    match: (p: string) => p.startsWith('/ops/tickets'),
    icon: Ticket,
  },
  {
    href: '/ops/stores',
    label: 'חנויות',
    match: (p: string) => p.startsWith('/ops/stores'),
    icon: Store,
  },
  {
    href: '/ops/reports',
    label: 'דוחות',
    match: (p: string) => p.startsWith('/ops/reports'),
    icon: BarChart3,
  },
  {
    href: '/ops/settings',
    label: 'הגדרות',
    match: (p: string) => p.startsWith('/ops/settings'),
    icon: Settings,
  },
]

const BOTTOM = [
  { href: '/ops', label: 'סקירה', match: (p: string) => p === '/ops', icon: LayoutDashboard },
  {
    href: '/ops/tickets',
    label: 'תקלות',
    match: (p: string) => p.startsWith('/ops/tickets'),
    icon: Ticket,
  },
  {
    href: '/ops/stores',
    label: 'חנויות',
    match: (p: string) => p.startsWith('/ops/stores'),
    icon: Store,
  },
]

const MORE_LINKS = [
  { href: '/ops/settings#maintenance', label: 'תחזוקה (בקרוב)', icon: Wrench },
  { href: '/ops/reports', label: 'דוחות', icon: BarChart3 },
  { href: '/ops/settings', label: 'הגדרות', icon: Settings },
  { href: '/ops/simulator', label: 'סימולטור WhatsApp', icon: FlaskConical },
  { href: '/tech', label: 'פורטל טכנאי', icon: Smartphone },
  { href: '/login', label: 'התחברות', icon: LogIn },
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
  const [moreOpen, setMoreOpen] = useState(false)
  const moreActive =
    pathname.startsWith('/ops/settings') ||
    pathname.startsWith('/ops/reports') ||
    pathname.startsWith('/ops/simulator')

  return (
    <div className="min-h-[100dvh] bg-canvas text-foreground">
      {/* Desktop sidebar */}
      <aside
        className="fixed inset-y-0 start-0 z-30 hidden border-e border-border bg-surface md:flex md:w-[var(--sidebar-width)] md:flex-col"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="flex h-12 items-center gap-2 border-b border-border px-4">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-[6px] bg-accent text-[10px] font-semibold text-white">
            OC
          </span>
          <span className="text-[13px] font-semibold tracking-tight">MaintainOS</span>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 p-2">
          {SIDEBAR.map((item) => {
            const active = item.match(pathname)
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2 rounded-[var(--radius-md)] px-2.5 py-2 text-[13px] transition-colors',
                  active
                    ? 'bg-canvas text-foreground ring-1 ring-border'
                    : 'text-muted hover:bg-canvas hover:text-foreground',
                )}
              >
                <Icon className={cn('h-4 w-4', active && 'text-accent')} />
                {item.label}
              </Link>
            )
          })}
        </nav>
        <div className="border-t border-border p-3 text-[11px] text-faint">
          Optical Center · ישראל
        </div>
      </aside>

      {/* Main column */}
      <div className="md:ps-[var(--sidebar-width)]">
        <header
          className="sticky top-0 z-20 border-b border-border bg-surface/95 backdrop-blur"
          style={{ paddingTop: 'env(safe-area-inset-top)' }}
        >
          <div className="flex h-12 items-center justify-between gap-3 px-4">
            <div className="flex min-w-0 flex-1 items-center gap-3 md:max-w-md">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-[6px] bg-accent text-[10px] font-semibold text-white md:hidden">
                OC
              </span>
              <div className="relative hidden w-full md:block">
                <Search className="pointer-events-none absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-faint" />
                <Input
                  name="q"
                  form="ops-global-search"
                  placeholder="חיפוש תקלות / חנויות"
                  className="ps-8"
                  defaultValue=""
                />
              </div>
            </div>
            <div className="text-[11px] text-faint">ישראל</div>
          </div>
        </header>

        <main className="px-4 py-5 pb-[calc(var(--mobile-bottom-nav-height)+env(safe-area-inset-bottom)+16px)] md:pb-5">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-[21px] font-semibold tracking-tight">{title}</h1>
              {subtitle ? (
                <p className="mt-1 text-[13px] text-muted">{subtitle}</p>
              ) : null}
            </div>
            {actions ? (
              <div className="flex items-center gap-2">{actions}</div>
            ) : null}
          </div>
          {/* Desktop search form target for tickets via GET redirect helper */}
          <form id="ops-global-search" action="/ops/tickets" method="get" className="hidden" />
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border bg-surface md:hidden"
        style={{
          height: 'calc(var(--mobile-bottom-nav-height) + env(safe-area-inset-bottom))',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {BOTTOM.map((item) => {
          const active = item.match(pathname)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px]',
                active ? 'text-accent' : 'text-muted',
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          )
        })}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className={cn(
            'flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px]',
            moreActive ? 'text-accent' : 'text-muted',
          )}
        >
          <MoreHorizontal className="h-5 w-5" />
          עוד
        </button>
      </nav>

      <Drawer open={moreOpen} onOpenChange={setMoreOpen} title="עוד">
        <ul className="space-y-1">
          {MORE_LINKS.map((item) => {
            const Icon = item.icon
            return (
              <li key={item.href + item.label}>
                <Link
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  className="flex min-h-[var(--touch-min)] items-center gap-3 rounded-[var(--radius-md)] px-2 text-[14px] text-foreground hover:bg-canvas"
                >
                  <Icon className="h-4 w-4 text-muted" />
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </Drawer>
    </div>
  )
}
