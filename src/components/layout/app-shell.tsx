'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useMemo, useState } from 'react'
import {
  BarChart3,
  Box,
  Ellipsis,
  Inbox,
  LayoutDashboard,
  MessageSquare,
  QrCode,
  ScrollText,
  Settings,
  Smartphone,
  Store,
  Truck,
  Users,
  type LucideIcon,
} from 'lucide-react'
import type { NavTool } from '@/lib/auth/nav-access'
import { ALL_NAV_TOOLS } from '@/lib/auth/nav-access'
import { BottomSheet } from '@/components/ui/overlay'
import { LogoutButton } from '@/components/auth/logout-button'
import { cn } from '@/lib/utils'

/**
 * Operational Quiet shell — Bamakor Pulse
 * Desktop: surface sidebar with soft edge lift; active nav uses tenant soft fill.
 * Mobile: blur top bar + page title; bottom nav 64px (Bamakor) with tenant active.
 */

type NavItem = {
  href: string
  label: string
  icon: LucideIcon
  match: string
}

const PRIMARY: NavItem[] = [
  {
    href: '/ops/dashboard',
    label: 'לוח בקרה',
    icon: LayoutDashboard,
    match: '/ops/dashboard',
  },
  { href: '/ops/tickets', label: 'תקלות', icon: Inbox, match: '/ops/tickets' },
  { href: '/ops/stores', label: 'חנויות', icon: Store, match: '/ops/stores' },
]

const TOOL_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: 'תפעול',
    items: [
      {
        href: '/ops/inbox',
        label: 'תיבת WhatsApp',
        icon: MessageSquare,
        match: '/ops/inbox',
      },
      { href: '/ops/assets', label: 'נכסים', icon: Box, match: '/ops/assets' },
      {
        href: '/ops/vendors',
        label: 'ספקים',
        icon: Truck,
        match: '/ops/vendors',
      },
      {
        href: '/ops/activity',
        label: 'יומן פעילות',
        icon: ScrollText,
        match: '/ops/activity',
      },
      {
        href: '/ops/reports',
        label: 'דוחות',
        icon: BarChart3,
        match: '/ops/reports',
      },
    ],
  },
  {
    label: 'מערכת',
    items: [
      {
        href: '/ops/settings',
        label: 'הגדרות',
        icon: Settings,
        match: '/ops/settings',
      },
      { href: '/ops/users', label: 'משתמשים', icon: Users, match: '/ops/users' },
      {
        href: '/ops/stores/print-qr',
        label: 'הדפסת QR',
        icon: QrCode,
        match: '/ops/stores/print-qr',
      },
      {
        href: '/ops/simulator',
        label: 'סימולטור WhatsApp',
        icon: Smartphone,
        match: '/ops/simulator',
      },
    ],
  },
]

function isActive(pathname: string, match: string) {
  return pathname === match || pathname.startsWith(`${match}/`)
}

function filterToolGroups(tools: NavTool[]) {
  const allowed = new Set(tools.map((t) => t.href))
  return TOOL_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => allowed.has(item.href)),
  })).filter((group) => group.items.length > 0)
}

function SidebarNavLink({
  item,
  pathname,
}: {
  item: NavItem
  pathname: string
}) {
  const active = isActive(pathname, item.match)
  const Icon = item.icon

  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        't-control relative flex h-10 items-center gap-2.5 rounded-[var(--radius-md)] px-3 transition-colors duration-[var(--dur-1)]',
        active
          ? 'bg-[var(--tenant-soft)] text-[var(--tenant)]'
          : 'text-ink-2 hover:bg-surface-sunken/70 hover:text-ink',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'absolute inset-block-2 w-[2px] rounded-full start-0',
          active ? 'bg-[var(--tenant)]' : 'bg-transparent',
        )}
      />
      <Icon
        className={cn(
          'h-4 w-4 shrink-0',
          active ? 'text-[var(--tenant)]' : undefined,
        )}
        aria-hidden
      />
      {item.label}
    </Link>
  )
}

function pageTitle(pathname: string): string {
  if (pathname.startsWith('/ops/dashboard')) return 'לוח בקרה'
  if (pathname.startsWith('/ops/tickets')) return 'תקלות'
  if (pathname.startsWith('/ops/stores/print-qr')) return 'הדפסת QR'
  if (pathname.startsWith('/ops/stores')) return 'חנויות'
  if (pathname.startsWith('/ops/assets')) return 'נכסים'
  if (pathname.startsWith('/ops/vendors')) return 'ספקים'
  if (pathname.startsWith('/ops/activity')) return 'יומן פעילות'
  if (pathname.startsWith('/ops/inbox')) return 'תיבת WhatsApp'
  if (pathname.startsWith('/ops/reports')) return 'דוחות'
  if (pathname.startsWith('/ops/users')) return 'משתמשים'
  if (pathname.startsWith('/ops/settings')) return 'הגדרות'
  if (pathname.startsWith('/ops/simulator')) return 'סימולטור'
  return 'MaintainOS'
}

function TenantMark() {
  return (
    <span
      aria-hidden
      className="t-body-strong inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--tenant)] text-[var(--tenant-contrast)] shadow-[var(--shadow-1)]"
    >
      OC
    </span>
  )
}

export function AppShell({
  children,
  tools = ALL_NAV_TOOLS,
}: {
  children: React.ReactNode
  tools?: NavTool[]
}) {
  const pathname = usePathname() ?? ''
  const [moreOpen, setMoreOpen] = useState(false)
  const toolGroups = useMemo(() => filterToolGroups(tools), [tools])

  return (
    <div className="dvh-screen bg-canvas text-ink">
      {/* ---------- Desktop sidebar ---------- */}
      <aside
        className="fixed inset-block-0 bottom-0 top-0 z-30 hidden flex-col border-border bg-surface shadow-[var(--shadow-1)] start-0 border-e md:flex"
        style={{ width: 'var(--nav-w)' }}
      >
        <div
          className="border-b border-border bg-gradient-to-b from-[var(--tenant-soft)]/80 to-surface px-4"
          style={{ height: 'var(--topbar-h)' }}
        >
          <div className="flex h-full items-center gap-2.5">
            <TenantMark />
            <div className="min-w-0">
              <p className="t-body-strong truncate text-ink">MaintainOS</p>
              <p className="t-caption truncate text-ink-3">Optical Center</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <p className="t-caption mb-2 px-2.5 text-ink-3">ניווט עיקרי</p>
          <ul className="space-y-1">
            {PRIMARY.map((item) => (
              <li key={item.href}>
                <SidebarNavLink item={item} pathname={pathname} />
              </li>
            ))}
          </ul>

          {toolGroups.map((group) => (
            <div key={group.label} className="mt-6">
              <p className="t-caption mb-2 px-2.5 text-ink-3">{group.label}</p>
              <ul className="space-y-1">
                {group.items.map((item) => (
                  <li key={item.href}>
                    <SidebarNavLink item={item} pathname={pathname} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-border p-3">
          <div className="px-2.5">
            <LogoutButton className="w-full justify-start px-0" />
          </div>
          <div className="mt-1 flex items-center gap-2 px-2.5 py-2">
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
      <header className="safe-pt sticky top-0 z-30 border-b border-border bg-surface/95 shadow-[var(--shadow-1)] backdrop-blur-md md:hidden">
        <div
          className="flex items-center gap-2.5 px-4"
          style={{ height: 'var(--topbar-h)' }}
        >
          <TenantMark />
          <div className="min-w-0 flex-1">
            <p className="t-body-strong truncate text-ink">{pageTitle(pathname)}</p>
          </div>
          <span className="t-caption text-ink-3">Optical Center · ישראל</span>
        </div>
      </header>

      {/* ---------- Content ---------- */}
      <div className="md:ps-[var(--nav-w)]">
        <main
          id="main-content"
          className="pb-nav mx-auto w-full max-w-[1280px] px-4 pt-5 md:px-8 md:pt-7"
        >
          {children}
        </main>
      </div>

      {/* ---------- Mobile bottom navigation ---------- */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 shadow-[var(--shadow-1)] backdrop-blur-md md:hidden"
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
                    'flex h-full flex-col items-center justify-center gap-1 transition-colors duration-[var(--dur-1)]',
                    active ? 'nav-pill-active' : 'text-ink-3',
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
              className="flex h-full w-full flex-col items-center justify-center gap-1 text-ink-3 transition-colors duration-[var(--dur-1)]"
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
        {toolGroups.map((group) => (
          <div key={group.label} className="mb-5 last:mb-0">
            <p className="t-caption mb-2 text-ink-3">{group.label}</p>
            <ul className="divide-y divide-border">
              {group.items.map((item) => {
                const Icon = item.icon
                const active = isActive(pathname, item.match)
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setMoreOpen(false)}
                      className={cn(
                        't-body flex min-h-[var(--tap)] items-center gap-2.5 transition-colors',
                        active ? 'text-[var(--tenant)]' : 'text-ink',
                      )}
                    >
                      <Icon
                        className={cn(
                          'h-4 w-4 shrink-0',
                          active ? 'text-[var(--tenant)]' : 'text-ink-3',
                        )}
                        aria-hidden
                      />
                      {item.label}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
        <div className="mt-4">
          <LogoutButton size="touch" variant="secondary" className="w-full" />
        </div>
        <p className="t-caption mt-4 text-ink-3">
          Optical Center · פיילוט ישראל
        </p>
      </BottomSheet>
    </div>
  )
}
