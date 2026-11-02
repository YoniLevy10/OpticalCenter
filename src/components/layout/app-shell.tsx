'use client'

import { AgentBubble } from '@/components/ops/agent-bubble'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  BarChart3,
  Bell,
  CheckSquare,
  ClipboardCheck,
  Ellipsis,
  FileText,
  Inbox,
  LayoutDashboard,
  Menu,
  PanelRightClose,
  PanelRightOpen,
  MessageSquare,
  Package,
  ScrollText,
  Settings,
  Store,
  Truck,
  UserRound,
  Users,
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
import { LiveSync } from '@/components/layout/live-sync'
import { SkipLink } from '@/components/layout/skip-link'
import { PullToRefresh } from '@/components/layout/pull-to-refresh'
import { ThemeToggle } from '@/components/theme/theme-toggle'
import { SystemStatusBanner } from '@/components/ops/system-status-banner'
import { LargeTitleScrollSync } from '@/components/ops/large-title'
import { LocaleSwitcher } from '@/components/i18n/locale-switcher'
import { usePhrase, useT } from '@/components/i18n/locale-provider'
import type { MessageKey } from '@/lib/i18n/messages'
import { DeskBell } from '@/components/layout/desk-bell'
import type { DeskNotices } from '@/modules/ops/desk-notices'
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
]

const TOOL_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: 'תפעול',
    items: [
      {
        href: '/ops/pilot',
        label: 'כמה נחסך',
        icon: Activity,
        match: '/ops/pilot',
      },
      {
        href: '/ops/tasks',
        label: 'משימות',
        icon: CheckSquare,
        match: '/ops/tasks',
      },
      {
        href: '/ops/alerts',
        label: 'מה דורש פעולה',
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
        href: '/ops/assets',
        label: 'ציוד וחלקים',
        icon: Package,
        match: '/ops/assets',
      },
      {
        href: '/ops/vendors',
        label: 'ספקים',
        icon: Truck,
        match: '/ops/vendors',
      },
      {
        href: '/ops/activity',
        label: 'מה שכבר קרה',
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
      { href: '/ops/users', label: 'משתמשים', icon: Users, match: '/ops/users' },
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
  return TOOL_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => allowed.has(item.href)),
  })).filter((group) => group.items.length > 0)
}

function alertCount(href: string, notices: DeskNotices): number {
  if (href === '/ops/approvals') return notices.approvals
  if (href === '/ops/documents') return notices.documents
  return 0
}

function NavAlert({ count }: { count: number }) {
  if (count <= 0) return null
  const label = count > 99 ? '99+' : String(count)
  return (
    <span className="nav-alert" aria-hidden>
      {label}
    </span>
  )
}

function waitingLabel(name: string, count: number) {
  return count > 0 ? `${name}, ${count} ממתינים` : undefined
}

function SidebarNavLink({
  item,
  pathname,
  notices,
}: {
  item: NavItem
  pathname: string
  notices: DeskNotices
}) {
  const active = isActive(pathname, item.match)
  const Icon = item.icon
  const count = alertCount(item.href, notices)
  const t = useT()
  const key = HREF_KEY[item.href]
  const name = key ? t(key) : item.label

  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      aria-label={waitingLabel(name, count)}
      className={cn(
        'sidebar-nav-link t-control relative flex h-9 items-center gap-2.5 rounded-[var(--radius-md)] px-3 transition-colors duration-[var(--dur-1)]',
        active ? 'text-ink' : 'text-ink-2',
      )}
    >
      <Icon
        className={cn(
          'h-4 w-4 shrink-0',
          active ? 'text-[var(--tenant)]' : 'text-ink-3',
        )}
        aria-hidden
      />
      <NavText href={item.href} fallback={item.label} />
      <NavAlert count={count} />
    </Link>
  )
}

function DrawerNavLink({
  item,
  pathname,
  notices,
  onNavigate,
}: {
  item: NavItem
  pathname: string
  notices: DeskNotices
  onNavigate: () => void
}) {
  const active = isActive(pathname, item.match)
  const Icon = item.icon
  const mark = sectionMark(item.href)
  const count = alertCount(item.href, notices)
  const t = useT()
  const key = HREF_KEY[item.href]
  const name = key ? t(key) : item.label

  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      aria-label={waitingLabel(name, count)}
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
      <NavAlert count={count} />
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

const QUIET_NOTICES: DeskNotices = { approvals: 0, documents: 0, bundles: [] }

export function AppShell({
  children,
  tools = ALL_NAV_TOOLS,
  notices = QUIET_NOTICES,
}: {
  children: React.ReactNode
  tools?: NavTool[]
  notices?: DeskNotices
}) {
  const pathname = usePathname() ?? ''
  const t = useT()
  const p = usePhrase()
  const [menuOpen, setMenuOpen] = useState(false)
  const [navHidden, setNavHidden] = useState(false)
  const toolGroups = useMemo(() => filterToolGroups(tools), [tools])
  const fillMain = pathname.startsWith('/ops/inbox')
  const closeMenu = () => setMenuOpen(false)

  useEffect(() => {
    try {
      setNavHidden(localStorage.getItem('mos_nav_hidden') === '1')
    } catch {
      /* private mode */
    }
  }, [])

  function toggleNav() {
    setNavHidden((current) => {
      const next = !current
      try {
        localStorage.setItem('mos_nav_hidden', next ? '1' : '0')
      } catch {
        /* private mode */
      }
      return next
    })
  }

  return (
    <div
      className="ops-atmosphere ops-shell-mobile dvh-screen flex min-w-0 flex-col overflow-x-hidden text-ink md:block md:overflow-x-hidden"
      style={navHidden ? { ['--nav-w' as string]: '0px' } : undefined}
    >
      <SkipLink />
      <LiveSync />
      <LargeTitleScrollSync />
      {/* ---------- Desktop sidebar ---------- */}
      <aside
        aria-label={p('תפריט צד')}
        className={cn(
          'apple-sidebar fixed inset-block-0 bottom-0 top-0 z-30 hidden flex-col border-e border-border/80 text-ink start-0',
          navHidden ? 'md:hidden' : 'md:flex',
        )}
        style={{ width: 'var(--nav-w)' }}
      >
        <div
          className="border-b border-border/70 px-5"
          style={{ height: 'var(--topbar-h)' }}
        >
          <div className="flex h-full items-center gap-1">
            <Link
              href="/ops/dashboard"
              className="flex h-full min-w-0 flex-1 items-center gap-2.5 rounded-[var(--radius-md)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--tenant)]"
            >
              <TenantMark />
              <p className="t-body-strong truncate text-ink">MILO</p>
            </Link>
            <button
              type="button"
              aria-label={p('הסתר תפריט')}
              onClick={toggleNav}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] text-ink-2 transition-colors hover:bg-surface-sunken hover:text-ink"
            >
              <PanelRightClose className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>

        <nav aria-label={p('ניווט עיקרי')} className="flex-1 overflow-y-auto px-3 py-4">
          <DeskBell label={t('nav.control')} items={notices.bundles} />
          <ul className="flex flex-col gap-1">
            {PRIMARY.map((item) => (
              <li key={item.href}>
                <SidebarNavLink item={item} pathname={pathname} notices={notices} />
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
                    <SidebarNavLink item={item} pathname={pathname} notices={notices} />
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
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--radius-md)] text-ink transition-colors hover:bg-surface-sunken"
          >
            <Menu className="h-6 w-6" aria-hidden />
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
              'mx-auto min-w-0 w-full max-w-[1280px] max-md:overflow-x-clip max-md:overscroll-x-none outline-none md:px-8',
              navHidden && 'md:max-w-none',
              fillMain
                ? 'ops-main-fill min-h-0 flex-1 px-0 md:px-8'
                : 'scroll-edge-fade min-h-0 flex-1 overflow-x-clip overflow-y-auto overscroll-x-none overscroll-y-auto px-4 pt-5 pb-nav md:overflow-visible md:pt-7 md:[mask-image:none] md:[-webkit-mask-image:none]',
            )}
          >
            <div className="mb-4 hidden items-center justify-between md:flex">
              {navHidden ? (
                <button
                  type="button"
                  aria-label={p('הצג תפריט')}
                  onClick={toggleNav}
                  className="flex h-9 items-center gap-2 rounded-[var(--radius-md)] border border-border bg-surface px-3 text-ink-2 shadow-[var(--shadow-1)] transition-colors hover:text-ink"
                >
                  <PanelRightOpen className="h-4 w-4" aria-hidden />
                  <span className="t-caption">{p('הצג תפריט')}</span>
                </button>
              ) : (
                <span />
              )}
              <SystemStatusBanner compact />
            </div>
            {children}
          </main>
        </PullToRefresh>
      </div>

      {/* ---------- Mobile bottom navigation ---------- */}
      <nav
        aria-label={p('ניווט תחתון')}
        className="phone-tabbar fixed inset-x-3 z-30 md:hidden"
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
                  aria-label={waitingLabel(
                    HREF_KEY[item.href] ? t(HREF_KEY[item.href]) : item.label,
                    alertCount(item.href, notices),
                  )}
                  className={cn(
                    'press-scale flex h-full flex-col items-center justify-center gap-1 transition-colors duration-[var(--dur-1)]',
                    active ? 'nav-pill-active' : 'text-ink-3',
                  )}
                >
                  <Icon className="h-6 w-6" aria-hidden />
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
              <Ellipsis className="h-6 w-6" aria-hidden />
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
        <DeskBell label={t('nav.control')} items={notices.bundles} />
        <ul className="mb-4 flex flex-col gap-0.5">
          {PRIMARY.map((item) => (
            <li key={item.href}>
              <DrawerNavLink
                item={item}
                pathname={pathname}
                notices={notices}
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
                    notices={notices}
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
      {pathname.startsWith('/ops') && !pathname.startsWith('/ops/pilot') ? <AgentBubble /> : null}
    </div>
  )
}
