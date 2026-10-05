'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useMemo, useState } from 'react'
import {
  BarChart3,
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
  Activity,
  type LucideIcon,
} from 'lucide-react'
import {
  sectionChipClass,
  sectionIconClass,
  sectionMark,
} from '@/components/ops/section-palette'
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
import { LocaleSwitcher } from '@/components/i18n/locale-switcher'
import { useT } from '@/components/i18n/locale-provider'
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
        label: 'פיילוט',
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
  const mark = sectionMark(item.href)

  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'sidebar-nav-link t-control relative flex h-9 items-center gap-2.5 rounded-[var(--radius-md)] px-2.5 transition-colors duration-[var(--dur-1)]',
        active ? 'text-[var(--tenant)]' : 'text-ink-2',
      )}
    >
      <span
        className={cn(
          'flex h-6 w-6 shrink-0 items-center justify-center rounded-[var(--radius-sm)]',
          active ? 'bg-transparent' : sectionChipClass[mark],
        )}
      >
        <Icon
          className={cn('h-3.5 w-3.5', !active && sectionIconClass[mark])}
          aria-hidden
        />
      </span>
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
  const mark = sectionMark(item.href)

  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      onClick={onNavigate}
      className={cn(
        't-body flex min-h-[var(--tap)] items-center gap-2.5 rounded-[var(--radius-md)] px-3 transition-colors',
        active
          ? 'bg-[var(--tenant-soft)] font-medium text-[var(--tenant)]'
          : 'text-ink-2 hover:bg-surface-sunken hover:text-ink',
      )}
    >
      <span
        className={cn(
          'flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--radius-sm)]',
          sectionChipClass[mark],
        )}
      >
        <Icon className={cn('h-4 w-4', sectionIconClass[mark])} aria-hidden />
      </span>
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
  const t = useT()
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
              <p className="t-body-strong truncate text-ink">MILO</p>
              <p className="t-caption truncate text-ink-3">
                {t('nav.tenant')}
              </p>
            </div>
          </Link>
        </div>

        <nav aria-label="ניווט עיקרי" className="flex-1 overflow-y-auto px-3 py-4">
          <p className="t-caption mb-2 px-2.5 text-ink-3">{t('nav.control')}</p>
          <ul className="flex flex-col gap-1">
            {PRIMARY.map((item) => (
              <li key={item.href}>
                <SidebarNavLink item={item} pathname={pathname} />
              </li>
            ))}
          </ul>

          {toolGroups.map((group) => (
            <div key={group.label} className="mt-6">
              <p className="t-caption mb-2 px-2.5 text-ink-3">
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

        <div className="border-t border-border/70 p-3">
          <div className="flex items-center justify-between gap-2 px-2.5 pb-2">
            <span className="t-caption text-ink-3">{t('nav.language')}</span>
            <LocaleSwitcher />
          </div>
          <div className="flex items-center justify-between gap-2 px-2.5 pb-2">
            <span className="t-caption text-ink-3">{t('nav.theme')}</span>
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
              {t('nav.tenant')}
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
          <Link href="/ops/dashboard" aria-label="דשבורד" className="shrink-0">
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
      <div
        className={cn(
          'flex min-h-0 min-w-0 flex-1 flex-col md:block md:ps-[var(--nav-w)]',
          !fillMain &&
            'max-md:pb-[calc(var(--bottomnav-h)+var(--bottomnav-gap)+var(--safe-b))]',
        )}
      >
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
                : 'scroll-edge-fade min-h-0 flex-1 overflow-y-auto overscroll-y-auto px-4 pt-5 pb-nav md:overflow-visible md:pt-7 md:[mask-image:none] md:[-webkit-mask-image:none]',
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
            const mark = sectionMark(item.href)
            return (
              <li key={item.href} className="flex-1">
                <Link
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'press-scale flex h-full flex-col items-center justify-center gap-1 transition-colors duration-[var(--dur-1)]',
                    active ? 'nav-pill-active' : sectionIconClass[mark],
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
