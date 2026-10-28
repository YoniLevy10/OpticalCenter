'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useMemo, useState } from 'react'
import {
  Activity,
  BarChart3,
  Bell,
  Box,
  CheckSquare,
  ClipboardCheck,
  Ellipsis,
  FileText,
  HardHat,
  Inbox,
  LayoutDashboard,
  Menu,
  MessageSquare,
  Package,
  QrCode,
  ScrollText,
  Settings,
  Smartphone,
  Store,
  Truck,
  UserRound,
  Users,
  type LucideIcon,
} from 'lucide-react'
import type { NavTool } from '@/lib/auth/nav-access'
import { ALL_NAV_TOOLS } from '@/lib/auth/nav-access'
import { SideDrawer } from '@/components/ui/overlay'
import { LogoutButton } from '@/components/auth/logout-button'
import { BrandMark } from '@/components/brand/brand-mark'
import { SkipLink } from '@/components/layout/skip-link'
import { LiveSync } from '@/components/layout/live-sync'
import { PullToRefresh } from '@/components/layout/pull-to-refresh'
import { ThemeToggle } from '@/components/theme/theme-toggle'
import { SystemStatusBanner } from '@/components/ops/system-status-banner'
import { LargeTitleScrollSync } from '@/components/ops/large-title'
import { LocaleSwitcher } from '@/components/i18n/locale-switcher'
import { usePhrase, useT } from '@/components/i18n/locale-provider'
import type { MessageKey } from '@/lib/i18n/messages'
import { cn } from '@/lib/utils'

/**
 * Optical Precision shell
 * Optical Center is the tenant identity; MILO remains the quiet platform layer.
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
    label: 'דשבורד',
    icon: LayoutDashboard,
    match: '/ops/dashboard',
  },
  { href: '/ops/tickets', label: 'תקלות', icon: Inbox, match: '/ops/tickets' },
  {
    href: '/ops/approvals',
    label: 'אישורים',
    icon: ClipboardCheck,
    match: '/ops/approvals',
  },
  {
    href: '/ops/tasks',
    label: 'משימות',
    icon: CheckSquare,
    match: '/ops/tasks',
  },
]

const TOOL_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: 'תפעול',
    items: [
      {
        href: '/ops/alerts',
        label: 'התראות',
        icon: Bell,
        match: '/ops/alerts',
      },
      { href: '/ops/stores', label: 'חנויות', icon: Store, match: '/ops/stores' },
      {
        href: '/ops/inbox',
        label: 'WhatsApp',
        icon: MessageSquare,
        match: '/ops/inbox',
      },
      {
        href: '/ops/professionals',
        label: 'אנשי מקצוע',
        icon: UserRound,
        match: '/ops/professionals',
      },
      {
        href: '/ops/documents',
        label: 'מסמכים',
        icon: FileText,
        match: '/ops/documents',
      },
      {
        href: '/ops/inventory',
        label: 'מלאי',
        icon: Package,
        match: '/ops/inventory',
      },
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
      {
        href: '/ops/pilot',
        label: 'ROI',
        icon: Activity,
        match: '/ops/pilot',
      },
    ],
  },
  {
    label: 'מערכת',
    items: [
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
      /** Always last in the system group */
      {
        href: '/ops/settings',
        label: 'הגדרות',
        icon: Settings,
        match: '/ops/settings',
      },
    ],
  },
]

const HREF_KEY: Record<string, MessageKey> = {
  '/ops/dashboard': 'nav.dashboard',
  '/ops/tickets': 'nav.tickets',
  '/ops/approvals': 'nav.approvals',
  '/ops/tasks': 'nav.tasks',
  '/ops/alerts': 'nav.alerts',
  '/ops/stores': 'nav.stores',
  '/ops/inbox': 'nav.whatsapp',
  '/ops/professionals': 'nav.professionals',
  '/ops/documents': 'nav.documents',
  '/ops/inventory': 'nav.inventory',
  '/ops/assets': 'nav.assets',
  '/ops/vendors': 'nav.vendors',
  '/ops/activity': 'nav.activity',
  '/ops/reports': 'nav.reports',
  '/ops/pilot': 'nav.pilot',
  '/ops/users': 'nav.users',
  '/ops/stores/print-qr': 'nav.printQr',
  '/ops/lab': 'nav.lab',
  '/ops/simulator': 'nav.simulator',
  '/tech': 'nav.tech',
  '/ops/settings': 'nav.settings',
}

function NavText({ href, fallback }: { href: string; fallback: string }) {
  const t = useT()
  const key = HREF_KEY[href]
  return <>{key ? t(key) : fallback}</>
}

function isActive(pathname: string, match: string) {
  return pathname === match || pathname.startsWith(`${match}/`)
}

function filterToolGroups(tools: NavTool[]) {
  const allowed = new Set(tools.map((t) => t.href))
  // Always keep core operational links that live outside ALL_NAV_TOOLS.
  allowed.add('/ops/stores')
  allowed.add('/tech')
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
        'sidebar-nav-link relative flex h-8 items-center gap-2 rounded-lg px-2 text-sm transition-colors',
        active
          ? 'font-medium text-sidebar-accent-foreground'
          : 'text-sidebar-foreground/80 hover:text-sidebar-accent-foreground',
      )}
    >
      <Icon className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
      <NavText href={item.href} fallback={item.label} />
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
        'flex min-h-9 items-center gap-2 rounded-md px-2 text-sm transition-colors',
        active
          ? 'bg-accent font-medium text-accent-foreground'
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
      )}
    >
      <Icon className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
      <NavText href={item.href} fallback={item.label} />
    </Link>
  )
}

function pageTitle(
  pathname: string,
  t: (key: MessageKey) => string,
): string {
  const match = Object.keys(HREF_KEY)
    .sort((a, b) => b.length - a.length)
    .find((href) => pathname === href || pathname.startsWith(`${href}/`))
  if (match) return t(HREF_KEY[match])
  if (pathname.startsWith('/ops/status')) return 'MILO'
  return 'MILO'
}

function TenantMark() {
  return (
    <BrandMark
      size={28}
      className="h-7 w-7 rounded-md"
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
  const t = useT()
  const p = usePhrase()
  const [menuOpen, setMenuOpen] = useState(false)
  const toolGroups = useMemo(() => filterToolGroups(tools), [tools])
  const fillMain = pathname.startsWith('/ops/inbox')
  const closeMenu = () => setMenuOpen(false)

  return (
    <div className="ops-atmosphere ops-shell-mobile dvh-screen flex min-w-0 flex-col overflow-x-hidden text-ink md:block md:overflow-x-hidden">
      <SkipLink />
      <LiveSync />
      <LargeTitleScrollSync />
      {/* ---------- Desktop sidebar ---------- */}
      <aside
        aria-label={p('תפריט צד')}
        className="apple-sidebar fixed inset-block-0 bottom-0 top-0 z-30 hidden flex-col border-e text-sidebar-foreground start-0 md:flex"
        style={{ width: 'var(--nav-w)' }}
      >
        <div className="flex h-14 items-center px-4">
          <Link
            href="/ops/dashboard"
            className="flex items-center gap-2 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <TenantMark />
            <p className="truncate text-sm font-semibold text-sidebar-foreground">MILO</p>
          </Link>
        </div>

        <nav aria-label={p('ניווט עיקרי')} className="flex-1 overflow-y-auto px-2 pb-4">
          <p className="mb-1 px-2 text-xs font-medium text-muted-foreground">{t('nav.control')}</p>
          <ul className="flex flex-col gap-1">
            {PRIMARY.map((item) => (
              <li key={item.href}>
                <SidebarNavLink item={item} pathname={pathname} />
              </li>
            ))}
          </ul>

          {toolGroups.map((group) => (
            <div key={group.label} className="mt-5">
              <p className="mb-1 px-2 text-xs font-medium text-muted-foreground">
                {group.label === 'מערכת' ? t('nav.system') : t('nav.operations')}
              </p>
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

        <div className="border-t p-2">
          <div className="flex items-center gap-2 rounded-lg px-2 py-2">
            <TenantMark />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-sidebar-foreground">
                {t('nav.tenant')}
              </p>
            </div>
          </div>
          <LogoutButton className="w-full justify-start" />
        </div>
      </aside>

      {/* ---------- Mobile top bar ---------- */}
      <header className="apple-glass safe-pt z-30 shrink-0 border-b border-border md:hidden">
        <div
          className="flex items-center gap-2.5 px-4"
          style={{ height: 'var(--topbar-h)' }}
        >
          <Link href="/ops/dashboard" aria-label={t('nav.dashboard')} className="shrink-0">
            <TenantMark />
          </Link>
          <div className="min-w-0 flex-1">
            <p
              className={cn(
                't-body-strong truncate text-ink',
                // Inbox fills the viewport (no scroll) — keep the title always on.
                fillMain
                  ? 'opacity-100'
                  : 'large-title-bar',
              )}
            >
              {pageTitle(pathname, t)}
            </p>
          </div>
          <button
            type="button"
            aria-label={p('תפריט ניווט')}
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
      <div
        className={cn(
          'flex min-h-0 min-w-0 flex-1 flex-col md:ps-[var(--nav-w)]',
          !fillMain &&
            'max-md:pb-[calc(var(--bottomnav-h)+var(--bottomnav-gap)+var(--safe-b))]',
        )}
      >
        <header className="sticky top-0 z-20 hidden h-12 shrink-0 items-center justify-between gap-3 border-b bg-background px-4 md:flex">
          <p className="truncate text-sm font-medium text-foreground">
            {pageTitle(pathname, t)}
          </p>
          <div className="flex items-center gap-2">
            <SystemStatusBanner compact />
            <LocaleSwitcher />
            <ThemeToggle compact />
          </div>
        </header>
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
                : 'min-h-0 flex-1 overflow-y-auto overscroll-y-auto px-4 pt-4 pb-nav md:overflow-visible md:px-6 md:pt-4',
            )}
          >
            {children}
          </main>
        </PullToRefresh>
      </div>

      {/* ---------- Mobile bottom navigation ---------- */}
      <nav
        aria-label={p('ניווט תחתון')}
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background md:hidden"
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
                    'press-scale flex h-full flex-col items-center justify-center gap-1 transition-colors duration-[var(--dur-1)]',
                    active ? 'nav-pill-active' : 'text-ink-3',
                  )}
                >
                  <Icon className="h-5 w-5" aria-hidden />
                  <span className="t-caption">
                    <NavText href={item.href} fallback={item.label} />
                  </span>
                </Link>
              </li>
            )
          })}
          <li className="flex-1">
            <button
              type="button"
              aria-expanded={menuOpen}
              aria-haspopup="dialog"
              aria-label={t('nav.more')}
              onClick={() => setMenuOpen(true)}
              className="flex h-full w-full flex-col items-center justify-center gap-1 text-ink-3 transition-colors duration-[var(--dur-1)]"
            >
              <Ellipsis className="h-5 w-5" aria-hidden />
              <span className="t-caption">{t('nav.more')}</span>
            </button>
          </li>
        </ul>
      </nav>

      <SideDrawer open={menuOpen} onOpenChange={setMenuOpen} title={t('nav.menu')}>
        <div className="mb-3 flex items-center justify-between px-3">
          <span className="t-caption text-ink-3">{t('nav.language')}</span>
          <LocaleSwitcher />
        </div>
        <p className="t-caption mb-1.5 px-3 text-ink-3">{t('nav.control')}</p>
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
            <p className="t-caption mb-1.5 px-3 text-ink-3">
              {group.label === 'מערכת' ? t('nav.system') : t('nav.operations')}
            </p>
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
