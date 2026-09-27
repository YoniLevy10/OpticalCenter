'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useMemo, useState } from 'react'
import {
  BarChart3,
  Box,
  Ellipsis,
  HardHat,
  Inbox,
  LayoutDashboard,
  Menu,
  MessageSquare,
  QrCode,
  ScrollText,
  Server,
  Settings,
  Smartphone,
  Store,
  Truck,
  Users,
  type LucideIcon,
} from 'lucide-react'
import type { NavTool } from '@/lib/auth/nav-access'
import { ALL_NAV_TOOLS } from '@/lib/auth/nav-access'
import { SideDrawer } from '@/components/ui/overlay'
import { LogoutButton } from '@/components/auth/logout-button'
import { BrandMark } from '@/components/brand/brand-mark'
import { SkipLink } from '@/components/layout/skip-link'
import { PullToRefresh } from '@/components/layout/pull-to-refresh'
import { ThemeToggle } from '@/components/theme/theme-toggle'
import { SystemStatusBanner } from '@/components/ops/system-status-banner'
import { LargeTitleScrollSync } from '@/components/ops/large-title'
import { cn } from '@/lib/utils'

/**
 * Optical Precision shell
 * Optical Center is the tenant identity; MaintainOS remains the quiet platform layer.
 * Desktop keeps navigation calm and persistent; mobile prioritizes the daily operating loop.
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
    label: 'ראשי',
    icon: LayoutDashboard,
    match: '/ops/dashboard',
  },
  { href: '/ops/tickets', label: 'תקלות', icon: Inbox, match: '/ops/tickets' },
  {
    href: '/ops/inbox',
    label: 'WhatsApp',
    icon: MessageSquare,
    match: '/ops/inbox',
  },
  { href: '/ops/stores', label: 'חנויות', icon: Store, match: '/ops/stores' },
]

const TOOL_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: 'תפעול',
    items: [
      { href: '/ops/assets', label: 'ציוד', icon: Box, match: '/ops/assets' },
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
        href: '/ops/status',
        label: 'מצב המערכת',
        icon: Server,
        match: '/ops/status',
      },
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
        href: '/ops/lab',
        label: 'מעבדה',
        icon: Smartphone,
        match: '/ops/lab',
      },
      {
        href: '/ops/simulator',
        label: 'סימולטור WhatsApp',
        icon: Smartphone,
        match: '/ops/simulator',
      },
      {
        href: '/tech',
        label: 'פורטל טכנאי',
        icon: HardHat,
        match: '/tech',
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
        't-control relative flex h-9 items-center gap-2.5 rounded-[var(--radius-md)] px-3 transition-colors duration-[var(--dur-1)]',
        active
          ? 'bg-[color-mix(in_srgb,var(--ink)_8%,transparent)] text-ink'
          : 'text-ink-2 hover:bg-[color-mix(in_srgb,var(--ink)_5%,transparent)] hover:text-ink',
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
  )
}

function DrawerNavLink({
  item,
  pathname,
  onNavigate,
}: {
  item: NavItem
  pathname: string
  onNavigate: () => void
}) {
  const active = isActive(pathname, item.match)
  const Icon = item.icon

  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      onClick={onNavigate}
      className={cn(
        't-body flex min-h-[var(--tap)] items-center gap-2.5 rounded-[var(--radius-md)] px-3 transition-colors',
        active
          ? 'bg-[var(--tenant-soft)] text-[var(--tenant)]'
          : 'text-ink hover:bg-surface-sunken',
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
  )
}

function pageTitle(pathname: string): string {
  if (pathname.startsWith('/ops/dashboard')) return 'ראשי'
  if (pathname.startsWith('/ops/tickets')) return 'תקלות'
  if (pathname.startsWith('/ops/stores/print-qr')) return 'הדפסת QR'
  if (pathname.startsWith('/ops/stores')) return 'חנויות'
  if (pathname.startsWith('/ops/assets')) return 'ציוד'
  if (pathname.startsWith('/ops/vendors')) return 'ספקים'
  if (pathname.startsWith('/ops/activity')) return 'יומן פעילות'
  if (pathname.startsWith('/ops/status')) return 'מצב המערכת'
  if (pathname.startsWith('/ops/inbox')) return 'WhatsApp'
  if (pathname.startsWith('/ops/reports')) return 'דוחות'
  if (pathname.startsWith('/ops/users')) return 'משתמשים'
  if (pathname.startsWith('/ops/settings')) return 'הגדרות'
  if (pathname.startsWith('/ops/lab')) return 'מעבדה'
  if (pathname.startsWith('/ops/simulator')) return 'סימולטור'
  return 'MaintainOS'
}

function TenantMark() {
  return (
    <BrandMark
      size={36}
      className="h-9 w-9 rounded-[var(--radius-md)] shadow-[var(--shadow-1)]"
      alt=""
    />
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
  const [menuOpen, setMenuOpen] = useState(false)
  const toolGroups = useMemo(() => filterToolGroups(tools), [tools])
  const fillMain = pathname.startsWith('/ops/inbox')
  const closeMenu = () => setMenuOpen(false)

  return (
    <div className="ops-atmosphere ops-shell-mobile dvh-screen flex min-w-0 flex-col overflow-x-hidden text-ink md:block md:overflow-x-hidden">
      <SkipLink />
      <LargeTitleScrollSync />
      {/* ---------- Desktop sidebar ---------- */}
      <aside
        aria-label="תפריט צד"
        className="apple-sidebar fixed inset-block-0 bottom-0 top-0 z-30 hidden flex-col border-e border-border/80 text-ink start-0 md:flex"
        style={{ width: 'var(--nav-w)' }}
      >
        <div
          className="border-b border-border/70 px-5"
          style={{ height: 'var(--topbar-h)' }}
        >
          <Link
            href="/ops/dashboard"
            className="flex h-full items-center gap-2.5 rounded-[var(--radius-md)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--tenant)]"
          >
            <TenantMark />
            <div className="min-w-0">
              <p className="t-body-strong truncate text-ink">MaintainOS</p>
              <p className="t-caption truncate text-ink-3">
                Optical Center · ישראל
              </p>
            </div>
          </Link>
        </div>

        <nav aria-label="ניווט עיקרי" className="flex-1 overflow-y-auto px-3 py-4">
          <p className="t-caption mb-2 px-2.5 text-ink-3">מרכז שליטה</p>
          <ul className="flex flex-col gap-1">
            {PRIMARY.map((item) => (
              <li key={item.href}>
                <SidebarNavLink item={item} pathname={pathname} />
              </li>
            ))}
          </ul>

          {toolGroups.map((group) => (
            <div key={group.label} className="mt-6">
              <p className="t-caption mb-2 px-2.5 text-ink-3">{group.label}</p>
              <ul className="flex flex-col gap-1">
                {group.items.map((item) => (
                  <li key={item.href}>
                    <SidebarNavLink item={item} pathname={pathname} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-border/70 p-3">
          <div className="flex items-center justify-between gap-2 px-2.5 pb-2">
            <span className="t-caption text-ink-3">ערכת נושא</span>
            <ThemeToggle compact />
          </div>
          <div className="px-2.5">
            <LogoutButton className="w-full justify-start px-0 text-ink-2 hover:text-ink" />
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
      <header className="apple-glass safe-pt z-30 shrink-0 border-b border-white/50 md:hidden">
        <div
          className="flex items-center gap-2.5 px-4"
          style={{ height: 'var(--topbar-h)' }}
        >
          <Link href="/ops/dashboard" aria-label="ראשי" className="shrink-0">
            <TenantMark />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="large-title-bar t-body-strong truncate text-ink">
              {pageTitle(pathname)}
            </h1>
          </div>
          <button
            type="button"
            aria-label="תפריט ניווט"
            aria-expanded={menuOpen}
            aria-haspopup="dialog"
            onClick={() => setMenuOpen(true)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] text-ink transition-colors hover:bg-surface-sunken"
          >
            <Menu className="h-5 w-5" aria-hidden />
          </button>
        </div>
      </header>

      {/* ---------- Content ---------- */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col md:block md:ps-[var(--nav-w)]">
        <PullToRefresh
          disabled={fillMain}
          className={cn(
            'flex min-h-0 flex-1 flex-col md:block',
            fillMain && 'md:min-h-0',
          )}
        >
          <main
            id="main-content"
            tabIndex={-1}
            className={cn(
              'mx-auto min-w-0 w-full max-w-[1280px] outline-none md:px-8',
              fillMain
                ? 'ops-main-fill min-h-0 flex-1 px-0 md:px-8'
                : 'scroll-edge-fade min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-5 pb-nav md:overflow-visible md:pt-7 md:[mask-image:none] md:[-webkit-mask-image:none]',
            )}
          >
            <div className="mb-4 hidden justify-end md:flex">
              <SystemStatusBanner compact />
            </div>
            {children}
          </main>
        </PullToRefresh>
      </div>

      {/* ---------- Mobile bottom navigation ---------- */}
      <nav
        aria-label="ניווט תחתון"
        className="fixed inset-x-3 z-30 md:hidden"
        style={{ bottom: 'calc(var(--safe-b) + var(--bottomnav-gap))' }}
      >
        <ul
          className="apple-glass flex overflow-hidden rounded-[28px]"
          style={{ height: 'var(--bottomnav-h)' }}
        >
          {PRIMARY.map((item) => {
            const active = isActive(pathname, item.match)
            const Icon = item.icon
            return (
              <li key={item.href} className="flex-1">
                <Link
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'press-scale flex h-full flex-col items-center justify-center gap-1 transition-colors duration-[var(--dur-1)]',
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
              aria-expanded={menuOpen}
              aria-haspopup="dialog"
              aria-label="עוד"
              onClick={() => setMenuOpen(true)}
              className="flex h-full w-full flex-col items-center justify-center gap-1 text-ink-3 transition-colors duration-[var(--dur-1)]"
            >
              <Ellipsis className="h-5 w-5" aria-hidden />
              <span className="t-caption">עוד</span>
            </button>
          </li>
        </ul>
      </nav>

      <SideDrawer open={menuOpen} onOpenChange={setMenuOpen} title="ניווט">
        <p className="t-caption mb-1.5 px-3 text-ink-3">מרכז שליטה</p>
        <ul className="mb-4 flex flex-col gap-0.5">
          {PRIMARY.map((item) => (
            <li key={item.href}>
              <DrawerNavLink
                item={item}
                pathname={pathname}
                onNavigate={closeMenu}
              />
            </li>
          ))}
        </ul>
        {toolGroups.map((group) => (
          <div key={group.label} className="mb-4">
            <p className="t-caption mb-1.5 px-3 text-ink-3">{group.label}</p>
            <ul className="flex flex-col gap-0.5">
              {group.items.map((item) => (
                <li key={item.href}>
                  <DrawerNavLink
                    item={item}
                    pathname={pathname}
                    onNavigate={closeMenu}
                  />
                </li>
              ))}
            </ul>
          </div>
        ))}
        <div className="mt-2 border-t border-border px-1 pt-3">
          <LogoutButton size="touch" variant="secondary" className="w-full" />
        </div>
      </SideDrawer>
    </div>
  )
}
