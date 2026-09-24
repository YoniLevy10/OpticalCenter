# layouts.md — app shells & layout wrappers

### `src/components/layout/app-shell.tsx`

```tsx
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
import { BottomSheet } from '@/components/ui/overlay'
import { LogoutButton } from '@/components/auth/logout-button'
import { BrandMark } from '@/components/brand/brand-mark'
import { SkipLink } from '@/components/layout/skip-link'
import { PullToRefresh } from '@/components/layout/pull-to-refresh'
import { ThemeToggle, ThemeToggleOnDark } from '@/components/theme/theme-toggle'
import { SystemStatusBanner } from '@/components/ops/system-status-banner'
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
        't-control relative flex h-10 items-center gap-2.5 rounded-[var(--radius-md)] px-3 transition-colors duration-[var(--dur-1)]',
        active
          ? 'bg-white/10 text-white'
          : 'text-white/70 hover:bg-white/5 hover:text-white',
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
      className="h-9 w-9 rounded-[var(--radius-md)] ring-1 ring-white/15"
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
  const [moreOpen, setMoreOpen] = useState(false)
  const toolGroups = useMemo(() => filterToolGroups(tools), [tools])

  return (
    <div className="dvh-screen min-w-0 overflow-x-hidden bg-canvas text-ink">
      <SkipLink />
      {/* ---------- Desktop sidebar ---------- */}
      <aside
        aria-label="תפריט צד"
        className="fixed inset-block-0 bottom-0 top-0 z-30 hidden flex-col border-border bg-[var(--panel-dark)] text-[var(--panel-dark-fg)] shadow-[var(--shadow-pop)] start-0 border-e md:flex"
        style={{ width: 'var(--nav-w)' }}
      >
        <div
          className="border-b border-white/10 bg-[var(--panel-dark)] px-5"
          style={{ height: 'var(--topbar-h)' }}
        >
          <div className="flex h-full items-center gap-2.5">
            <TenantMark />
            <div className="min-w-0">
              <p className="t-body-strong truncate text-white">MaintainOS</p>
              <p className="t-caption truncate text-white/55">
                Optical Center · ישראל
              </p>
            </div>
          </div>
        </div>

        <nav aria-label="ניווט עיקרי" className="flex-1 overflow-y-auto px-3 py-4">
          <p className="t-caption mb-2 px-2.5 text-white/50">מרכז שליטה</p>
          <ul className="flex flex-col gap-1">
            {PRIMARY.map((item) => (
              <li key={item.href}>
                <SidebarNavLink item={item} pathname={pathname} />
              </li>
            ))}
          </ul>

          {toolGroups.map((group) => (
            <div key={group.label} className="mt-6">
              <p className="t-caption mb-2 px-2.5 text-white/50">{group.label}</p>
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

        <div className="border-t border-white/10 p-3">
          <div className="flex items-center justify-between gap-2 px-2.5 pb-2">
            <span className="t-caption text-white/50">ערכת נושא</span>
            <ThemeToggleOnDark />
          </div>
          <div className="px-2.5">
            <LogoutButton className="w-full justify-start px-0 text-white/80 hover:text-white" />
          </div>
          <div className="mt-1 flex items-center gap-2 px-2.5 py-2">
            <span
              aria-hidden
              className="h-1.5 w-1.5 rounded-full bg-[var(--signal-resolved)]"
            />
            <span className="t-caption truncate text-white/50">
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
            <h1 className="t-body-strong truncate text-ink">
              {pageTitle(pathname)}
            </h1>
          </div>
          <ThemeToggle compact className="shrink-0" />
          <span className="t-caption hidden shrink-0 text-ink-3 sm:inline">Optical Center · ישראל</span>
        </div>
      </header>

      {/* ---------- Content ---------- */}
      <div className="min-w-0 md:ps-[var(--nav-w)]">
        <PullToRefresh>
          <main
            id="main-content"
            tabIndex={-1}
            className="pb-nav mx-auto min-w-0 w-full max-w-[1280px] px-4 pt-5 outline-none md:px-8 md:pt-7"
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
              aria-expanded={moreOpen}
              aria-haspopup="dialog"
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
        <p className="t-caption mt-1 text-ink-3">מצב הדגמה</p>
      </BottomSheet>
    </div>
  )
}

```
### `src/components/layout/ops-app-shell.tsx`

```tsx
import { AppShell } from '@/components/layout/app-shell'
import { getServerActor } from '@/lib/auth/server-actor'
import { resolveNavTools } from '@/lib/auth/nav-access'

export async function OpsAppShell({ children }: { children: React.ReactNode }) {
  const actor = await getServerActor()
  const tools = resolveNavTools(actor)
  return <AppShell tools={tools}>{children}</AppShell>
}

```
### `src/components/layout/tech-shell.tsx`

```tsx
import { BackButton } from '@/components/layout/back-button'
import { SkipLink } from '@/components/layout/skip-link'
import { PullToRefresh } from '@/components/layout/pull-to-refresh'
import { ThemeToggle } from '@/components/theme/theme-toggle'
import { BrandMark } from '@/components/brand/brand-mark'
import { cn } from '@/lib/utils'
import { LogoutButton } from '@/components/auth/logout-button'

/**
 * The technician is a field worker on a phone, often one-handed, often with bad
 * signal. This shell is deliberately NOT the HQ shell:
 *
 *  - no HQ navigation of any kind
 *  - no bottom tab bar (there is only one destination — the job list)
 *  - the primary action is sticky at the thumb, not buried in a sidebar
 */
export function TechShell({
  children,
  title,
  subtitle,
  backHref,
  backLabel = 'חזרה לעבודות',
  eyebrow,
  actions,
  headerActions,
  enablePullToRefresh,
}: {
  children: React.ReactNode
  title: string
  subtitle?: React.ReactNode
  backHref?: string
  backLabel?: string
  eyebrow?: string
  actions?: React.ReactNode
  headerActions?: React.ReactNode
  enablePullToRefresh?: boolean
}) {
  const body = (
    <main
      id="main-content"
      tabIndex={-1}
      className={cn(
        'mx-auto w-full max-w-xl px-4 pt-5 outline-none',
        actions ? 'pb-actions scroll-pb-actions' : 'pb-8',
      )}
    >
      {children}
    </main>
  )

  return (
    <div className="dvh-screen bg-canvas text-ink">
      <SkipLink />
      <header className="safe-pt sticky top-0 z-20 border-b border-border bg-surface/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-xl items-start gap-2.5 px-4 py-3.5">
          {backHref ? <BackButton href={backHref} label={backLabel} /> : null}
          {!backHref ? (
            <BrandMark size={32} className="mt-0.5 rounded-[var(--radius-md)]" alt="" />
          ) : null}
          <div className="min-w-0 flex-1">
            <p className="t-caption text-ink-3">{eyebrow ?? 'Optical Center · טכנאי'}</p>
            <h1 className="t-title mt-0.5 truncate text-ink">{title}</h1>
            {subtitle ? (
              <div className="t-meta mt-0.5 truncate text-ink-2">{subtitle}</div>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {headerActions}
            <ThemeToggle compact />
            <LogoutButton size="touch" className="shrink-0" />
          </div>
        </div>
      </header>

      {enablePullToRefresh ? <PullToRefresh>{body}</PullToRefresh> : body}

      {actions ? (
        <div
          aria-label="פעולות עבודה"
          className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/90 backdrop-blur-md"
          style={{ paddingBottom: 'calc(var(--safe-b) + 12px)' }}
        >
          <div className="mx-auto w-full max-w-xl px-4 pt-3">{actions}</div>
        </div>
      ) : null}
    </div>
  )
}

export { techHref } from '@/lib/tech-href'

```
### `src/components/layout/store-shell.tsx`

```tsx
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
    <div className="dvh-screen bg-canvas text-ink">
      <header className="safe-pt border-b border-border bg-surface shadow-[var(--shadow-1)]">
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

```
### `src/components/layout/page-toolbar.tsx`

```tsx
import { BackButton } from '@/components/layout/back-button'
import { RefreshButton } from '@/components/layout/refresh-button'
import { cn } from '@/lib/utils'

export function PageToolbar({
  backHref,
  backLabel,
  title,
  meta,
  actions,
  onRefresh,
  showRefresh,
  className,
}: {
  backHref?: string
  backLabel?: string
  title?: string
  meta?: React.ReactNode
  actions?: React.ReactNode
  onRefresh?: () => void | Promise<void>
  showRefresh?: boolean
  className?: string
}) {
  if (!backHref && !title && !actions && !showRefresh) return null

  return (
    <div
      className={cn(
        'mb-4 flex flex-wrap items-center gap-x-3 gap-y-2 md:hidden',
        className,
      )}
    >
      {backHref ? <BackButton href={backHref} label={backLabel} /> : null}
      {title ? (
        <div className="min-w-0 flex-1">
          {/* Decorative title — page heroes own the sole <h1> */}
          <p className="t-title text-ink">{title}</p>
          {meta ? <p className="t-meta text-ink-3">{meta}</p> : null}
        </div>
      ) : (
        <div className="flex-1" />
      )}
      <div className="flex items-center gap-1">
        {showRefresh ? <RefreshButton onRefresh={onRefresh} /> : null}
        {actions}
      </div>
    </div>
  )
}

```
### `src/components/layout/skip-link.tsx`

```tsx
export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-[100] focus:rounded-[var(--radius-md)] focus:bg-surface focus:px-4 focus:py-2 focus:shadow-[var(--shadow-pop)] focus:outline-none focus:ring-2 focus:ring-[var(--tenant)]"
    >
      דלג לתוכן
    </a>
  )
}

```
### `src/components/layout/back-button.tsx`

```tsx
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { VisuallyHidden } from '@/components/ui/a11y'

export function BackButton({
  href,
  label = 'חזרה',
  className,
}: {
  href: string
  label?: string
  className?: string
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className={cn(
        '-ms-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-md)] text-ink-2 transition-colors duration-[var(--dur-1)] hover:bg-surface-sunken/60',
        className,
      )}
    >
      <ChevronRight className="h-5 w-5 rtl:rotate-0 ltr:rotate-180" aria-hidden />
      <VisuallyHidden>{label}</VisuallyHidden>
    </Link>
  )
}

```
### `src/components/layout/refresh-button.tsx`

```tsx
'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function RefreshButton({
  onRefresh,
  label = 'רענון',
}: {
  onRefresh?: () => void | Promise<void>
  label?: string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [busy, setBusy] = useState(false)

  function handleClick() {
    startTransition(async () => {
      setBusy(true)
      try {
        if (onRefresh) await onRefresh()
        else router.refresh()
      } finally {
        setBusy(false)
      }
    })
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="touch"
      aria-label={label}
      aria-busy={pending || busy}
      disabled={pending || busy}
      onClick={handleClick}
      className="shrink-0 px-2"
    >
      <RefreshCw
        className={`h-4 w-4 ${pending || busy ? 'animate-spin' : ''}`}
        aria-hidden
      />
    </Button>
  )
}

```
### `src/components/layout/pull-to-refresh.tsx`

```tsx
'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useRef, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

const THRESHOLD = 72
const MAX_PULL = 96

export function PullToRefresh({
  children,
  onRefresh,
  disabled,
  className,
}: {
  children: React.ReactNode
  onRefresh?: () => void | Promise<void>
  disabled?: boolean
  className?: string
}) {
  const router = useRouter()
  const startY = useRef(0)
  const pulling = useRef(false)
  const [pull, setPull] = useState(0)
  const [refreshing, setRefreshing] = useState(false)

  const runRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      if (onRefresh) await onRefresh()
      else router.refresh()
    } finally {
      setRefreshing(false)
      setPull(0)
    }
  }, [onRefresh, router])

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (disabled || refreshing) return
      if (typeof window !== 'undefined' && window.scrollY > 0) return
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
      startY.current = e.touches[0]?.clientY ?? 0
      pulling.current = true
    },
    [disabled, refreshing],
  )

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!pulling.current || disabled || refreshing) return
      const y = e.touches[0]?.clientY ?? 0
      const delta = Math.max(0, Math.min(MAX_PULL, y - startY.current))
      if (delta > 0 && window.scrollY <= 0) {
        setPull(delta)
      }
    },
    [disabled, refreshing],
  )

  const onTouchEnd = useCallback(() => {
    if (!pulling.current) return
    pulling.current = false
    if (pull >= THRESHOLD) void runRefresh()
    else setPull(0)
  }, [pull, runRefresh])

  const active = pull > 0 || refreshing

  return (
    <div
      className={cn('relative', className)}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
    >
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center overflow-hidden transition-[height,opacity] duration-[var(--dur-1)]',
          active ? 'opacity-100' : 'opacity-0',
        )}
        style={{ height: active ? Math.max(pull, refreshing ? 40 : 0) : 0 }}
      >
        <RefreshCw
          className={cn(
            'mt-2 h-5 w-5 text-ink-3',
            (refreshing || pull >= THRESHOLD) && 'animate-spin text-[var(--tenant)]',
          )}
        />
      </div>
      <div
        className="transition-transform duration-[var(--dur-1)]"
        style={{
          transform: active ? `translateY(${refreshing ? 24 : pull * 0.35}px)` : undefined,
        }}
      >
        {children}
      </div>
    </div>
  )
}

```
### `src/components/brand/brand-mark.tsx`

```tsx
import Image from 'next/image'
import { cn } from '@/lib/utils'

/**
 * Optical Center official brand mark (red diamond + OC glasses).
 * Bamakor pattern: one fallback mark path reused in shell / login / splash / offline.
 */
const MARK_BLACK = '/brand/oc-mark.png'
const MARK_CLEAR = '/brand/oc-mark-transparent.png'

export type BrandMarkSize = 28 | 32 | 36 | 40 | 48 | 56 | 64 | 72 | 80 | 88 | 112

const SIZE_CLASS: Record<BrandMarkSize, string> = {
  28: 'h-7 w-7',
  32: 'h-8 w-8',
  36: 'h-9 w-9',
  40: 'h-10 w-10',
  48: 'h-12 w-12',
  56: 'h-14 w-14',
  64: 'h-16 w-16',
  72: 'h-[4.5rem] w-[4.5rem]',
  80: 'h-20 w-20',
  88: 'h-[5.5rem] w-[5.5rem]',
  112: 'h-28 w-28',
}

export function BrandMark({
  size = 32,
  variant = 'black',
  className,
  priority,
  alt = 'Optical Center',
}: {
  size?: BrandMarkSize
  /** `black` = official square on black (PWA/dark). `clear` = diamond only for light chips. */
  variant?: 'black' | 'clear'
  className?: string
  priority?: boolean
  alt?: string
}) {
  const src = variant === 'clear' ? MARK_CLEAR : MARK_BLACK
  return (
    <Image
      src={src}
      alt={alt}
      width={size}
      height={size}
      priority={priority}
      className={cn(
        SIZE_CLASS[size],
        'shrink-0 rounded-[var(--radius-md)] object-cover shadow-[var(--shadow-1)]',
        className,
      )}
    />
  )
}

/** Full stacked wordmark (icon + OPTICAL CENTER + ראייה & שמיעה) for splash/login hero. */
export function BrandLogoFull({
  className,
  priority,
}: {
  className?: string
  priority?: boolean
}) {
  return (
    <Image
      src="/brand/oc-logo-full.png"
      alt="Optical Center — ראייה ושמיעה"
      width={220}
      height={220}
      priority={priority}
      className={cn('h-auto w-[140px] object-contain md:w-[180px]', className)}
    />
  )
}

/** Lightweight loading splash — Bamakor AppSplashScreen pattern. */
export function BrandSplash({ label = 'MaintainOS' }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 py-12">
      <BrandMark size={80} priority className="rounded-[var(--radius-lg)] shadow-[var(--shadow-2)]" />
      <p className="t-caption text-ink-3">{label}</p>
      <span
        aria-hidden
        className="h-1 w-16 overflow-hidden rounded-full bg-surface-sunken"
      >
        <span className="block h-full w-1/2 animate-pulse rounded-full bg-[var(--tenant)]" />
      </span>
    </div>
  )
}

```
### `src/app/layout.tsx`

```tsx
import type { Metadata, Viewport } from 'next'
import Script from 'next/script'
import { Heebo } from 'next/font/google'
import { ThemeProvider } from '@/components/theme/theme-provider'
import { ToastProvider } from '@/components/ui/toast'
import { THEME_BOOT_SCRIPT } from '@/lib/theme'
import './globals.css'

const heebo = Heebo({
  subsets: ['hebrew', 'latin'],
  variable: '--font-heebo',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'MaintainOS',
  description: 'מערכת דיווח וניהול תקלות — Optical Center',
  manifest: '/manifest.webmanifest',
  applicationName: 'MaintainOS',
  appleWebApp: {
    capable: true,
    title: 'Optical Center',
    statusBarStyle: 'default',
  },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icons/icon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
    shortcut: ['/icons/apple-touch-icon.png'],
  },
  openGraph: {
    title: 'MaintainOS · Optical Center',
    description: 'תחזוקה תפעולית לרשת Optical Center',
    images: [{ url: '/brand/oc-mark.png', width: 512, height: 512 }],
  },
}

export const viewport: Viewport = {
  /* Status-bar chrome; ThemeProvider updates meta theme-color at runtime. */
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#eef4f6' },
    { media: '(prefers-color-scheme: dark)', color: '#0e1619' },
  ],
  width: 'device-width',
  initialScale: 1,
  /* Required for safe-area insets to resolve in standalone PWA mode. */
  viewportFit: 'cover',
  interactiveWidget: 'resizes-content',
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="he" dir="rtl" suppressHydrationWarning>
      <body className={`${heebo.variable} font-sans antialiased`}>
        <Script
          id="maintainos-theme-boot"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }}
        />
        <ThemeProvider>
          <ToastProvider>{children}</ToastProvider>
        </ThemeProvider>
        <script
          dangerouslySetInnerHTML={{
            __html: `if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>{}))}`,
          }}
        />
      </body>
    </html>
  )
}

```
### `src/app/ops/layout.tsx`

```tsx
import { redirect } from 'next/navigation'
import { getServerActor } from '@/lib/auth/server-actor'
import { actorIsStoreEmployeeOnly, shouldAllowDemoEntry } from '@/lib/auth/home-path'

/** Block store-only staff from HQ shell routes. */
export default async function OpsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const actor = await getServerActor()
  if (!actor && shouldAllowDemoEntry()) return children
  if (actor && actorIsStoreEmployeeOnly(actor)) {
    redirect('/store')
  }
  return children
}

```
### `src/app/tech/layout.tsx`

```tsx
import type { Metadata, Viewport } from 'next'

/**
 * The technician PWA is a separate installable app with its own scope and
 * manifest — a field worker installs "טכנאי", not the HQ console.
 */
export const metadata: Metadata = {
  title: 'MaintainOS · טכנאי',
  description: 'פורטל טכנאי — Optical Center ישראל',
  manifest: '/manifest-tech.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'Optical Center · טכנאי',
    statusBarStyle: 'default',
  },
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
}

export const viewport: Viewport = {
  themeColor: '#ffffff',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function TechLayout({ children }: { children: React.ReactNode }) {
  return children
}

```
### `src/app/store/layout.tsx`

```tsx
import { redirect } from 'next/navigation'
import { getServerActor } from '@/lib/auth/server-actor'
import {
  primaryStoreId,
  shouldAllowDemoEntry,
} from '@/lib/auth/home-path'
import { hqRoles } from '@/lib/auth/types'
import { fetchStores } from '@/modules/stores/data'

export default async function StoreLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const actor = await getServerActor()
  if (!actor && !shouldAllowDemoEntry()) redirect('/login?next=/store')

  if (actor) {
    const isStoreStaff = actor.memberships.some(
      (m) => m.role === 'store_employee' || m.role === 'store_manager',
    )
    const isHq = actor.memberships.some((m) => hqRoles().includes(m.role))
    if (!isStoreStaff && !shouldAllowDemoEntry()) {
      redirect(isHq ? '/ops/dashboard' : '/login')
    }
  }

  let storeName: string | undefined
  let storeCode: string | undefined
  if (actor) {
    const sid = primaryStoreId(actor) ?? actor.memberships.find((m) => m.store_id)?.store_id
    if (sid) {
      const { stores } = await fetchStores()
      const store = stores.find((s) => s.id === sid)
      storeName = store?.name
      storeCode = store?.code
    }
  }

  const { StoreShell } = await import('@/components/layout/store-shell')
  return (
    <StoreShell storeName={storeName} storeCode={storeCode}>
      {children}
    </StoreShell>
  )
}

```
