# components.md — shared UI primitives

Framework: Next.js App Router · React · Tailwind v4 · custom Operational Quiet primitives (not shadcn).

### `src/components/ui/a11y.tsx`

```tsx
import { cn } from '@/lib/utils'

export function VisuallyHidden({
  children,
  className,
  as: Tag = 'span',
}: {
  children: React.ReactNode
  className?: string
  as?: 'span' | 'div' | 'p'
}) {
  return <Tag className={cn('sr-only', className)}>{children}</Tag>
}

export function LiveRegion({
  children,
  politeness = 'polite',
  role,
  className,
}: {
  children: React.ReactNode
  politeness?: 'polite' | 'assertive'
  role?: 'status' | 'alert'
  className?: string
}) {
  return (
    <div
      role={role ?? (politeness === 'assertive' ? 'alert' : 'status')}
      aria-live={politeness}
      aria-atomic="true"
      className={className}
    >
      {children}
    </div>
  )
}

```
### `src/components/ui/action-menu.tsx`

```tsx
'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { MoreHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ActionMenuItem = {
  key: string
  label: string
  href?: string
  onSelect?: () => void
  tone?: 'default' | 'critical'
  disabled?: boolean
}

/**
 * Compact secondary-actions menu. Prefer one primary CTA elsewhere;
 * park print / share / deactivate here.
 */
export function ActionMenu({
  items,
  label = 'פעולות נוספות',
  align = 'end',
  className,
}: {
  items: ActionMenuItem[]
  label?: string
  align?: 'start' | 'end'
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const menuId = useId()

  useEffect(() => {
    if (!open) return
    function onPointer(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const visible = items.filter((i) => !i.disabled)

  if (visible.length === 0) return null

  return (
    <div ref={rootRef} className={cn('relative inline-flex', className)}>
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] border border-border bg-surface text-ink-2 transition-colors hover:bg-surface-sunken hover:text-ink"
      >
        <MoreHorizontal className="h-4 w-4" aria-hidden />
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          className={cn(
            'absolute top-full z-30 mt-1 min-w-[10.5rem] overflow-hidden rounded-[var(--radius-md)] border border-border bg-surface-raised shadow-[var(--shadow-pop)]',
            align === 'end' ? 'end-0' : 'start-0',
          )}
        >
          {visible.map((item) => {
            const classNameItem = cn(
              't-body flex w-full items-center px-3 py-2.5 text-start transition-colors hover:bg-surface-sunken/60',
              item.tone === 'critical'
                ? 'text-[var(--signal-critical)]'
                : 'text-ink',
            )
            if (item.href) {
              const external = /^https?:\/\//i.test(item.href)
              return (
                <a
                  key={item.key}
                  role="menuitem"
                  href={item.href}
                  className={classNameItem}
                  onClick={() => setOpen(false)}
                  {...(external
                    ? { target: '_blank', rel: 'noopener noreferrer' }
                    : {})}
                >
                  {item.label}
                </a>
              )
            }
            return (
              <button
                key={item.key}
                type="button"
                role="menuitem"
                className={classNameItem}
                onClick={() => {
                  setOpen(false)
                  item.onSelect?.()
                }}
              >
                {item.label}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

```
### `src/components/ui/admin-row.tsx`

```tsx
import { cn } from '@/lib/utils'

/** Mobile list row for admin tables (non-navigating). */
export function AdminRow({
  leading,
  title,
  subtitle,
  footer,
  trailing,
  className,
}: {
  leading?: React.ReactNode
  title: React.ReactNode
  subtitle?: React.ReactNode
  footer?: React.ReactNode
  trailing?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex min-h-[72px] flex-col justify-center gap-1 border-b border-border px-4 py-3 last:border-b-0',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {leading ? (
            <span className="t-caption t-num text-ink-3">{leading}</span>
          ) : null}
          <div className="t-body-strong text-ink">{title}</div>
          {subtitle ? (
            <div className="t-body truncate text-ink-2">{subtitle}</div>
          ) : null}
        </div>
        {trailing}
      </div>
      {footer ? <div className="mt-1">{footer}</div> : null}
    </div>
  )
}

export function AdminRowList({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return <div className={cn('md:hidden', className)}>{children}</div>
}

```
### `src/components/ui/button.tsx`

```tsx
import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from '@radix-ui/react-slot'
import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * The only button in MaintainOS.
 * `primary` is the sole place tenant colour may fill a control.
 * `critical` is a SIGNAL colour and never a tenant colour.
 */
const buttonVariants = cva(
  't-control inline-flex select-none items-center justify-center gap-1.5 whitespace-nowrap rounded-[var(--radius-md)] transition-[background-color,border-color,color,opacity,box-shadow] duration-[var(--dur-1)] ease-[var(--ease)] active:opacity-90 disabled:pointer-events-none disabled:opacity-40',
  {
    variants: {
      variant: {
        primary:
          'bg-[var(--tenant)] text-[var(--tenant-contrast)] shadow-[var(--shadow-1)] hover:bg-[var(--tenant-hover)]',
        secondary:
          'border border-border bg-surface text-ink hover:border-border-strong hover:bg-surface-sunken/50',
        ghost: 'text-ink-2 hover:bg-surface-sunken hover:text-ink',
        critical:
          'border border-[var(--signal-critical-line)] bg-[var(--signal-critical-soft)] text-[var(--signal-critical)] hover:bg-[color-mix(in_srgb,var(--signal-critical)_10%,white)]',
        resolve:
          'bg-[var(--signal-resolved)] text-white shadow-[var(--shadow-1)] hover:bg-[color-mix(in_srgb,var(--signal-resolved)_88%,black)]',
      },
      size: {
        sm: 'h-8 px-2.5',
        md: 'h-9 px-3.5',
        /** Touch target floor for mobile and technician surfaces (48px). */
        touch: 'h-12 px-4 t-control-lg',
        block: 'h-12 w-full px-4 t-control-lg',
      },
    },
    defaultVariants: { variant: 'secondary', size: 'md' },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size }), className)}
        ref={ref}
        {...props}
      />
    )
  },
)
Button.displayName = 'Button'

export { buttonVariants }

```
### `src/components/ui/coming-soon-badge.tsx`

```tsx
'use client'

import { cn } from '@/lib/utils'

/** Marks features that are partially shipped — no silent 404. */
export function ComingSoonBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        't-caption inline-flex shrink-0 rounded-full border border-border bg-surface-sunken px-2 py-0.5 text-ink-3',
        className,
      )}
    >
      בקרוב
    </span>
  )
}

```
### `src/components/ui/evidence.tsx`

```tsx
'use client'

import { useState } from 'react'
import { ImageOff, Paperclip } from 'lucide-react'
import { Modal } from '@/components/ui/overlay'
import { cn } from '@/lib/utils'

export type Attachment = {
  id: string
  url: string
  kind?: string | null
}

function isImage(a: Attachment): boolean {
  if (a.kind === 'video') return false
  if (a.kind && a.kind !== 'image') return false
  return true
}

function isVideo(a: Attachment): boolean {
  return a.kind === 'video' || /\.(mp4|webm)(\?|$)/i.test(a.url)
}

/**
 * HQ must be able to inspect what the store actually photographed. Raw URLs
 * were never the UX. Uses plain <img> — attachment URLs are arbitrary remote
 * hosts and next/image would require per-tenant domain allow-listing.
 */
export function EvidenceGrid({
  attachments,
  className,
}: {
  attachments: Attachment[]
  className?: string
}) {
  const [active, setActive] = useState<Attachment | null>(null)
  const [failed, setFailed] = useState<Set<string>>(new Set())

  if (attachments.length === 0) return null

  const images = attachments.filter((a) => isImage(a) && !isVideo(a))
  const videos = attachments.filter(isVideo)
  const files = attachments.filter((a) => !isImage(a) && !isVideo(a))

  return (
    <div className={className}>
      {images.length > 0 ? (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {images.map((a) => {
            const broken = failed.has(a.id)
            return (
              <li key={a.id}>
                <button
                  type="button"
                  aria-label="הגדלת תמונה"
                  onClick={() => !broken && setActive(a)}
                  className={cn(
                    'relative block aspect-square w-full overflow-hidden rounded-[var(--radius-md)] border border-border bg-sunken transition-opacity duration-[var(--dur-1)]',
                    !broken && 'hover:opacity-90',
                  )}
                >
                  {broken ? (
                    <span className="flex h-full w-full items-center justify-center">
                      <ImageOff className="h-4 w-4 text-ink-3" aria-hidden />
                    </span>
                  ) : (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={a.url}
                      alt="תיעוד מהשטח"
                      loading="lazy"
                      className="h-full w-full object-cover"
                      onError={() =>
                        setFailed((prev) => new Set(prev).add(a.id))
                      }
                    />
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      ) : null}

      {videos.length > 0 ? (
        <ul className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {videos.map((a) => (
            <li key={a.id}>
              <video
                src={a.url}
                controls
                className="max-h-48 w-full rounded-[var(--radius-md)] border border-border bg-black"
              />
            </li>
          ))}
        </ul>
      ) : null}

      {files.length > 0 ? (
        <ul className="mt-2 space-y-1">
          {files.map((a) => (
            <li key={a.id}>
              <a
                href={a.url}
                target="_blank"
                rel="noreferrer"
                className="t-body inline-flex items-center gap-1.5 text-ink-2 hover:text-ink"
              >
                <Paperclip className="h-3.5 w-3.5" aria-hidden />
                קובץ מצורף
              </a>
            </li>
          ))}
        </ul>
      ) : null}

      <Modal
        open={Boolean(active)}
        onOpenChange={(v) => !v && setActive(null)}
        title="תיעוד מהשטח"
        className="w-[min(94vw,720px)]"
      >
        {active ? (
          <div className="flex flex-col gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={active.url}
              alt="תיעוד מהשטח"
              className="max-h-[70dvh] w-full rounded-[var(--radius-md)] object-contain"
            />
            <a
              href={active.url}
              target="_blank"
              rel="noreferrer"
              dir="ltr"
              className="t-caption block truncate text-ink-3 hover:text-ink-2"
            >
              {active.url}
            </a>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}

```
### `src/components/ui/input.tsx`

```tsx
'use client'

import * as React from 'react'
import { Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const fieldBase =
  'field-text w-full rounded-[var(--radius-md)] border border-border bg-surface text-ink placeholder:text-ink-3 transition-all duration-[var(--dur-1)] hover:border-border-strong focus:border-[color-mix(in_srgb,var(--tenant)_40%,var(--border-strong))] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--tenant)_12%,transparent)] disabled:opacity-50'

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(fieldBase, 'h-11 px-3 md:h-9', className)}
    {...props}
  />
))
Input.displayName = 'Input'

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(fieldBase, 'h-11 px-2.5 md:h-9', className)}
    {...props}
  >
    {children}
  </select>
))
Select.displayName = 'Select'

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(fieldBase, 'min-h-24 px-3 py-2 leading-relaxed', className)}
    {...props}
  />
))
Textarea.displayName = 'Textarea'

export function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string
  htmlFor?: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={htmlFor} className="t-caption block text-ink-2">
        {label}
      </label>
      {children}
      {hint ? <p className="t-caption text-ink-3">{hint}</p> : null}
    </div>
  )
}

/**
 * Instant search. No submit button — an operational inbox filters as you type.
 * Debounced so typing does not thrash the router.
 */
export function SearchField({
  value,
  onValueChange,
  placeholder,
  className,
  autoFocusKey,
}: {
  value: string
  onValueChange: (next: string) => void
  placeholder?: string
  className?: string
  /** Optional keyboard shortcut hint shown at rest, e.g. "/" */
  autoFocusKey?: string
}) {
  const ref = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (!autoFocusKey) return
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null
      const typing =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      if (e.key === autoFocusKey && !typing) {
        e.preventDefault()
        ref.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [autoFocusKey])

  return (
    <div className={cn('relative', className)}>
      <Search
        aria-hidden
        className="pointer-events-none absolute inset-block-0 my-auto h-4 w-4 text-ink-3/70 start-3 top-0 bottom-0"
      />
      <input
        ref={ref}
        type="search"
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder ?? 'חיפוש'}
        className={cn(fieldBase, 'h-11 ps-9 pe-9 md:h-9')}
      />
      {value ? (
        <button
          type="button"
          aria-label="ניקוי חיפוש"
          onClick={() => onValueChange('')}
          className="absolute top-0 bottom-0 my-auto flex h-6 w-6 items-center justify-center rounded-full text-ink-3 transition-colors hover:bg-canvas hover:text-ink end-2"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : autoFocusKey ? (
        <kbd className="t-caption pointer-events-none absolute top-0 bottom-0 my-auto hidden h-5 items-center rounded-[4px] border border-border px-1.5 text-ink-3 end-2 md:flex">
          {autoFocusKey}
        </kbd>
      ) : null}
    </div>
  )
}

```
### `src/components/ui/operational-row.tsx`

```tsx
import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { priorityEdgeClass, priorityRowClass } from '@/components/ui/signal'

/**
 * The mobile counterpart to a table row. Full-bleed with dividers — cards would
 * cost ~32px of horizontal padding per item and cut visible tickets by a third.
 *
 * Three lines, in decreasing order of decision value:
 *   1  identity + live SLA
 *   2  what is broken
 *   3  where + status + owner
 */
export function OperationalRow({
  href,
  priority,
  leading,
  trailing,
  title,
  subtitle,
  footer,
  className,
}: {
  href: string
  priority?: string | null
  leading: React.ReactNode
  trailing?: React.ReactNode
  title: React.ReactNode
  subtitle?: React.ReactNode
  footer?: React.ReactNode
  className?: string
}) {
  return (
    <Link
      href={href}
      className={cn(
        'flex min-h-[80px] flex-col justify-center gap-1.5 px-4 py-3.5 ps-5 transition-colors duration-[var(--dur-1)] active:bg-surface-sunken/50 md:hover:bg-surface-sunken/40',
        priorityEdgeClass(priority),
        priorityRowClass(priority),
        className,
      )}
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="t-caption t-num text-ink-3">{leading}</span>
        {trailing}
      </div>

      {priority === 'critical' ? (
        <span className="flex items-center gap-1 text-[var(--signal-critical)]">
          <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden />
          <span className="t-caption font-medium">דחוף</span>
        </span>
      ) : null}

      <span className="t-lead line-clamp-2 text-ink">{title}</span>

      {subtitle ? (
        <span className="t-body truncate text-ink-2">{subtitle}</span>
      ) : null}

      {footer ? (
        <div className="mt-0.5 flex items-center gap-2">{footer}</div>
      ) : null}
    </Link>
  )
}

export function RowList({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('divide-y divide-border bg-surface', className)}>
      {children}
    </div>
  )
}

/** Quiet inline separator for the row footer line. */
export function Dot() {
  return (
    <span aria-hidden className="t-caption text-ink-3">
      ·
    </span>
  )
}

```
### `src/components/ui/overlay.tsx`

```tsx
'use client'

import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

const overlayClass =
  'fixed inset-0 z-40 animate-fade bg-[rgba(18,18,20,0.35)] backdrop-blur-[2px]'

function CloseButton() {
  return (
    <Dialog.Close
      aria-label="סגירה"
      className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] text-ink-3 transition-colors duration-[var(--dur-1)] hover:bg-surface-sunken hover:text-ink"
    >
      <X className="h-4 w-4" />
    </Dialog.Close>
  )
}

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  title: string
  description?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={overlayClass} />
        <Dialog.Content
          className={cn(
            'fixed start-1/2 top-1/2 z-50 w-[min(92vw,440px)] -translate-x-1/2 -translate-y-1/2 animate-scale-in rounded-[var(--radius-xl)] border border-border bg-surface shadow-[var(--shadow-pop)] rtl:translate-x-1/2',
            className,
          )}
        >
          <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-3.5">
            <div>
              <Dialog.Title className="t-section text-ink">{title}</Dialog.Title>
              {description ? (
                <Dialog.Description className="t-meta mt-0.5 text-ink-2">
                  {description}
                </Dialog.Description>
              ) : null}
            </div>
            <CloseButton />
          </div>
          <div className="p-5">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

/**
 * Mobile bottom sheet. Respects the home indicator and caps at 88dvh so the
 * sheet never fights the keyboard.
 */
export function BottomSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={overlayClass} />
        <Dialog.Content
          className="fixed inset-x-0 bottom-0 z-50 flex max-h-[88dvh] animate-slide-up flex-col rounded-t-[var(--radius-xl)] border-t border-border bg-surface shadow-[var(--shadow-pop)]"
          style={{ paddingBottom: 'var(--safe-b)' }}
        >
          <div className="flex justify-center pt-2.5" aria-hidden>
            <span className="h-1 w-10 rounded-full bg-border-strong" />
          </div>
          <div className="flex items-start justify-between gap-3 px-5 pb-3 pt-2">
            <div>
              <Dialog.Title className="t-section text-ink">{title}</Dialog.Title>
              {description ? (
                <Dialog.Description className="t-meta mt-0.5 text-ink-2">
                  {description}
                </Dialog.Description>
              ) : null}
            </div>
            <CloseButton />
          </div>
          <div className="flex-1 overflow-y-auto px-5 pb-5">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

```
### `src/components/ui/phone-call-link.tsx`

```tsx
import { Phone } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Dial CTA — uses tel: for mobile PWA / HQ desk phones. */
export function PhoneCallLink({
  phone,
  label = 'חיוג',
  className,
}: {
  phone: string
  label?: string
  className?: string
}) {
  const digits = phone.replace(/[^\d+]/g, '')
  if (!digits) return null
  const href = digits.startsWith('+') ? `tel:${digits}` : `tel:+${digits}`

  return (
    <a
      href={href}
      dir="ltr"
      className={cn(
        't-control inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-md)] border border-border bg-surface px-3 text-ink transition-colors hover:bg-surface-sunken',
        className,
      )}
    >
      <Phone className="h-3.5 w-3.5 text-[var(--tenant)]" aria-hidden />
      <span className="t-num">{label === 'חיוג' ? phone : label}</span>
    </a>
  )
}

```
### `src/components/ui/primitives.tsx`

```tsx
import { Inbox } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Containers are the last resort. Prefer type and space, then a divider, then
 * a hairline, and only then a Panel.
 */

export function Panel({
  children,
  className,
  flush,
  elevated,
  ...rest
}: {
  children: React.ReactNode
  className?: string
  /** No padding — for tables and lists that manage their own row rhythm. */
  flush?: boolean
  /** Soft Bamakor-style lift for hero / primary surfaces. */
  elevated?: boolean
} & React.HTMLAttributes<HTMLElement>) {
  return (
    <section
      className={cn(
        'rounded-[var(--radius-lg)] border border-border/80 bg-surface',
        elevated && 'shadow-[var(--shadow-1)]',
        !flush && 'p-5',
        className,
      )}
      {...rest}
    >
      {children}
    </section>
  )
}

export function PanelHeader({
  title,
  meta,
  action,
}: {
  title: string
  meta?: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <header className="flex min-h-10 items-center justify-between gap-3 border-b border-border bg-surface-sunken/35 px-4">
      <div className="flex items-baseline gap-2">
        <h2 className="t-section text-ink">{title}</h2>
        {meta ? <span className="t-caption text-ink-3">{meta}</span> : null}
      </div>
      {action}
    </header>
  )
}

export function PageHeader({
  title,
  description,
  meta,
  actions,
  className,
}: {
  title: string
  /** Short supporting line under the title. */
  description?: React.ReactNode
  meta?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-start justify-between gap-x-4 gap-y-2 pb-1',
        className,
      )}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-3">
          <h1 className="t-title text-ink">{title}</h1>
          {meta ? <span className="t-meta text-ink-3">{meta}</span> : null}
        </div>
        {description ? (
          <p className="t-body mt-1 max-w-2xl text-ink-2">{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex items-center gap-2">{actions}</div>
      ) : null}
    </div>
  )
}

export function EmptyState({
  title,
  description,
  action,
  icon: Icon = Inbox,
  className,
}: {
  title: string
  description?: string
  action?: React.ReactNode
  icon?: typeof Inbox
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-1.5 px-6 py-10 text-center',
        className,
      )}
    >
      <Icon className="mb-2 h-5 w-5 text-ink-3" aria-hidden strokeWidth={1.5} />
      <p className="t-body-strong text-ink">{title}</p>
      {description ? (
        <p className="t-body mt-1.5 max-w-xs text-ink-2">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}

export function ErrorState({
  title = 'משהו השתבש',
  description,
  action,
}: {
  title?: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--signal-critical-line)] bg-[var(--signal-critical-soft)] px-4 py-3">
      <p className="t-body-strong text-[var(--signal-critical)]">{title}</p>
      {description ? (
        <p className="t-body mt-1 text-ink-2">{description}</p>
      ) : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  )
}

export function Notice({
  tone = 'neutral',
  children,
}: {
  tone?: 'neutral' | 'warning' | 'progress' | 'success' | 'critical'
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        't-body rounded-[var(--radius-md)] border px-4 py-2.5',
        tone === 'neutral' && 'border-border bg-surface text-ink-2',
        tone === 'warning' &&
          'border-[var(--signal-warning-line)] bg-[var(--signal-warning-soft)] text-[var(--signal-warning)]',
        tone === 'progress' &&
          'border-border bg-[var(--signal-progress-soft)] text-[var(--signal-progress)]',
        tone === 'success' &&
          'border-[color-mix(in_srgb,var(--signal-resolved)_28%,transparent)] bg-[var(--signal-resolved-soft)] text-[var(--signal-resolved)]',
        tone === 'critical' &&
          'border-[var(--signal-critical-line)] bg-[var(--signal-critical-soft)] text-[var(--signal-critical)]',
      )}
    >
      {children}
    </div>
  )
}

export function PermissionDenied({
  title = 'אין הרשאה',
  description = 'אין לך הרשאה לצפות במסך זה או לבצע פעולה זו.',
  action,
}: {
  title?: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--signal-warning-line)] bg-[var(--signal-warning-soft)] px-4 py-3">
      <p className="t-body-strong text-[var(--signal-warning)]">{title}</p>
      {description ? (
        <p className="t-body mt-1 text-ink-2">{description}</p>
      ) : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  )
}

export function SuccessNotice({ children }: { children: React.ReactNode }) {
  return <Notice tone="success">{children}</Notice>
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn('skeleton-shimmer rounded-[var(--radius-sm)]', className)}
    />
  )
}

/** Skeleton that mirrors the real queue geometry rather than a spinner. */
export function RowSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="divide-y divide-border">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 px-4"
          style={{ height: 'var(--row-h)' }}
        >
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-40" />
          <Skeleton className="hidden h-3 flex-1 md:block" />
          <Skeleton className="hidden h-3 w-20 md:block" />
          <Skeleton className="h-3 w-12" />
        </div>
      ))}
    </div>
  )
}

export function KeyValue({
  label,
  children,
  ltr,
}: {
  label: string
  children: React.ReactNode
  ltr?: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-2">
      <dt className="t-body shrink-0 text-ink-2">{label}</dt>
      <dd
        dir={ltr ? 'ltr' : undefined}
        className={cn('t-body text-end text-ink', ltr && 't-num')}
      >
        {children}
      </dd>
    </div>
  )
}

export function Divider({ className }: { className?: string }) {
  return <hr className={cn('border-t border-border', className)} />
}

```
### `src/components/ui/segmented.tsx`

```tsx
import Link from 'next/link'
import { cn } from '@/lib/utils'

/**
 * One tab language for the whole product. Views are URL-driven (link form) so
 * the operator can bookmark and share a queue; local tabs use the button form.
 */

type Segment = {
  key: string
  label: string
  count?: number
  href?: string
}

function segmentClass(active: boolean) {
  return cn(
    't-control inline-flex h-11 min-h-[var(--tap)] min-w-0 items-center justify-center gap-1.5 rounded-[var(--radius-sm)] px-3.5 transition-all duration-[var(--dur-1)] md:h-9 md:min-h-0',
    active
      ? 'bg-surface text-ink shadow-[var(--shadow-1)]'
      : 'text-ink-2 hover:bg-[var(--surface-sunken)]/40 hover:text-ink',
  )
}

function Count({ value, active }: { value: number; active: boolean }) {
  return (
    <span
      className={cn(
        't-caption t-num',
        active ? 'text-ink-3' : 'text-ink-3',
        value === 0 && 'opacity-45',
      )}
    >
      {value}
    </span>
  )
}

export function SegmentedLinks({
  segments,
  activeKey,
  className,
  scrollable,
}: {
  segments: Segment[]
  activeKey: string
  className?: string
  /** Horizontal scroll on narrow screens instead of wrapping. */
  scrollable?: boolean
}) {
  return (
    <div
      className={cn(
        'inline-flex gap-0.5 rounded-[var(--radius-md)] border border-border bg-[var(--surface-sunken)]/50 p-1',
        scrollable && 'max-w-full overflow-x-auto [scrollbar-width:none]',
        className,
      )}
    >
      {segments.map((s) => {
        const active = s.key === activeKey
        return (
          <Link
            key={s.key}
            href={s.href ?? '#'}
            aria-current={active ? 'page' : undefined}
            className={cn(segmentClass(active), 'shrink-0')}
          >
            {s.label}
            {typeof s.count === 'number' ? (
              <Count value={s.count} active={active} />
            ) : null}
          </Link>
        )
      })}
    </div>
  )
}

export function SegmentedButtons({
  segments,
  activeKey,
  onChange,
  className,
  fill,
  panelIdPrefix,
  mode = 'toggle',
}: {
  segments: Segment[]
  activeKey: string
  onChange: (key: string) => void
  className?: string
  /** Stretch to full width — used on technician mobile. */
  fill?: boolean
  panelIdPrefix?: string
  /** Use WAI-ARIA tabs when tab panels exist in the DOM. */
  mode?: 'tabs' | 'toggle'
}) {
  const isTabs = mode === 'tabs' && panelIdPrefix

  return (
    <div
      role={isTabs ? 'tablist' : 'group'}
      aria-orientation={isTabs ? 'horizontal' : undefined}
      className={cn(
        'inline-flex gap-0.5 rounded-[var(--radius-md)] border border-border bg-[var(--surface-sunken)]/50 p-1',
        fill && 'flex w-full',
        className,
      )}
    >
      {segments.map((s) => {
        const active = s.key === activeKey
        const panelId = panelIdPrefix ? `${panelIdPrefix}-${s.key}` : undefined
        return (
          <button
            key={s.key}
            type="button"
            role={isTabs ? 'tab' : undefined}
            id={isTabs ? `${panelIdPrefix}-tab-${s.key}` : undefined}
            aria-selected={isTabs ? active : undefined}
            aria-pressed={!isTabs ? active : undefined}
            aria-controls={isTabs ? panelId : undefined}
            tabIndex={isTabs ? (active ? 0 : -1) : undefined}
            onClick={() => onChange(s.key)}
            className={cn(segmentClass(active), fill && 'flex-1')}
          >
            {s.label}
            {typeof s.count === 'number' ? (
              <Count value={s.count} active={active} />
            ) : null}
          </button>
        )
      })}
    </div>
  )
}

```
### `src/components/ui/signal.tsx`

```tsx
import type { TicketPriority, TicketStatus } from '@/modules/tickets/constants'
import type { SlaTone, SlaView } from '@/modules/tickets/sla-display'
import { plainStatus, plainUrgency } from '@/components/ops/plain-labels'
import { cn } from '@/lib/utils'

/**
 * THE SIGNAL RULE (docs/DESIGN_SYSTEM.md §4)
 *
 *   Priority → leading edge     (position)
 *   Status   → typography       (text)
 *   SLA      → live tabular num (number)
 *
 * Three orthogonal dimensions must never share a visual shape, or the operator
 * cannot scan a single dimension vertically. None of these use tenant colour.
 */

/* ------------------------------------------------------------------ */
/* Priority — position-encoded leading edge                            */
/* ------------------------------------------------------------------ */

export function priorityEdgeClass(priority: string | null | undefined): string {
  if (priority === 'critical') return 'edge edge-critical'
  if (priority === 'high') return 'edge edge-high'
  if (priority === 'medium') return 'edge edge-medium'
  return 'edge'
}

/** Critical rows get a faint tint so a breach-heavy queue reads at a glance. */
export function priorityRowClass(priority: string | null | undefined): string {
  return priority === 'critical'
    ? 'bg-[var(--signal-critical-soft)]/40'
    : ''
}

/** Text form of priority, for detail surfaces where there is no row edge. */
export function PriorityText({
  priority,
  className,
}: {
  priority: TicketPriority | string
  className?: string
}) {
  const label = plainUrgency(priority)
  const strong = priority === 'critical' || priority === 'high'
  return (
    <span
      className={cn(
        't-body-strong inline-flex items-center gap-1.5',
        strong ? 'text-[var(--signal-critical)]' : 'text-ink',
        className,
      )}
    >
      {priority === 'critical' || priority === 'high' ? (
        <span
          aria-hidden
          className={cn(
            'h-2.5 w-[3px] rounded-full',
            priority === 'critical'
              ? 'bg-[var(--signal-critical)]'
              : 'bg-[var(--signal-critical)]/45',
          )}
        />
      ) : null}
      {label}
    </span>
  )
}

/* ------------------------------------------------------------------ */
/* Status — typography, with a marker only for states needing action   */
/* ------------------------------------------------------------------ */

type StatusTreatment = {
  className: string
  marker: string | null
}

function statusTreatment(status: string): StatusTreatment {
  switch (status) {
    case 'new':
      return {
        className: 'text-[var(--signal-critical)]',
        marker: 'bg-[var(--signal-critical)]',
      }
    case 'waiting_parts':
    case 'assigned':
    case 'triaged':
    case 'in_progress':
      return {
        className: 'text-[var(--signal-warning)]',
        marker: 'bg-[var(--signal-warning)]',
      }
    case 'resolved':
    case 'closed':
      return {
        className: 'text-[var(--signal-resolved)]',
        marker: 'bg-[var(--signal-resolved)]',
      }
    case 'cancelled':
      return { className: 'text-ink-3', marker: null }
    default:
      return { className: 'text-ink-2', marker: null }
  }
}

export function StatusLabel({
  status,
  className,
}: {
  status: TicketStatus | string
  className?: string
}) {
  const label = plainStatus(status)
  const { className: tone, marker } = statusTreatment(status)
  return (
    <span className={cn('t-body inline-flex items-center gap-1.5', tone, className)}>
      {marker ? (
        <span aria-hidden className={cn('h-1.5 w-1.5 rounded-full', marker)} />
      ) : null}
      {label}
    </span>
  )
}

/* ------------------------------------------------------------------ */
/* SLA — the only live number in the row                               */
/* ------------------------------------------------------------------ */

const slaToneClass: Record<SlaTone, string> = {
  idle: 'text-ink-3',
  neutral: 'text-ink-2',
  warning: 'text-[var(--signal-warning)]',
  critical: 'text-[var(--signal-critical)] font-medium',
  done: 'text-ink-3',
}

export function SlaValue({
  view,
  className,
}: {
  view: SlaView
  className?: string
}) {
  return (
    <span
      className={cn('t-body t-num', slaToneClass[view.tone], className)}
      title={view.long}
    >
      {view.short}
    </span>
  )
}

/** Detail-surface form: the value plus what deadline it refers to. */
export function SlaBlock({ view }: { view: SlaView }) {
  return (
    <div className="live-sla flex flex-col gap-0.5" data-live="sla">
      <span className={cn('t-lead t-num', slaToneClass[view.tone])}>
        {view.short}
      </span>
      <span className="t-caption text-ink-3">{view.long}</span>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Source — quiet metadata, never a badge                              */
/* ------------------------------------------------------------------ */

export function MetaValue({
  children,
  ltr,
  className,
}: {
  children: React.ReactNode
  ltr?: boolean
  className?: string
}) {
  return (
    <span
      dir={ltr ? 'ltr' : undefined}
      className={cn('t-meta text-ink-2', ltr && 't-num inline-block', className)}
    >
      {children}
    </span>
  )
}

```
### `src/components/ui/table.tsx`

```tsx
import Link from 'next/link'
import { ArrowDown, ArrowUp } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Desktop density. Rows are `--row-h` tall, hairline-separated, with the whole
 * row acting as a hit target via a stretched link on the primary cell.
 */

export function Table({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <table className={cn('w-full border-collapse', className)}>{children}</table>
  )
}

export function THead({ children }: { children: React.ReactNode }) {
  return (
    <thead>
      <tr className="sticky top-0 z-10 border-b border-border bg-sunken/50 backdrop-blur-sm">{children}</tr>
    </thead>
  )
}

export function TH({
  children,
  className,
  align = 'start',
  sort,
}: {
  children: React.ReactNode
  className?: string
  align?: 'start' | 'end'
  /** When present the header becomes a sort control. */
  sort?: { href: string; active: boolean; direction: 'asc' | 'desc' }
}) {
  const Icon = sort?.direction === 'asc' ? ArrowUp : ArrowDown
  return (
    <th
      scope="col"
      aria-sort={
        sort?.active
          ? sort.direction === 'asc'
            ? 'ascending'
            : 'descending'
          : undefined
      }
      className={cn(
        't-caption h-9 px-3 font-medium text-ink-3',
        align === 'end' ? 'text-end' : 'text-start',
        className,
      )}
    >
      {sort ? (
        <Link
          href={sort.href}
          className={cn(
            'inline-flex items-center gap-1 transition-colors hover:text-ink',
            sort.active && 'text-ink',
          )}
        >
          {children}
          {sort.active ? <Icon className="h-3 w-3" aria-hidden /> : null}
        </Link>
      ) : (
        children
      )}
    </th>
  )
}

export function TBody({ children }: { children: React.ReactNode }) {
  return <tbody>{children}</tbody>
}

export function TR({
  children,
  className,
  edgeClass,
}: {
  children: React.ReactNode
  className?: string
  /** Priority leading edge, applied via the `.edge` pseudo-element. */
  edgeClass?: string
}) {
  return (
    <tr
      className={cn(
        'group border-b border-border/70 transition-colors duration-[var(--dur-1)] hover:bg-canvas focus-within:bg-canvas',
        edgeClass,
        className,
      )}
      style={{ height: 'var(--row-h)' }}
    >
      {children}
    </tr>
  )
}

export function TD({
  children,
  className,
  align = 'start',
}: {
  children: React.ReactNode
  className?: string
  align?: 'start' | 'end'
}) {
  return (
    <td
      className={cn(
        'px-3 align-middle',
        align === 'end' ? 'text-end' : 'text-start',
        className,
      )}
    >
      {children}
    </td>
  )
}

/** Makes the entire row clickable without nesting interactive elements. */
export function RowLink({
  href,
  children,
  label,
}: {
  href: string
  children: React.ReactNode
  label?: string
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none"
    >
      {children}
    </Link>
  )
}

```
### `src/components/ui/time.tsx`

```tsx
'use client'

import { useEffect, useState } from 'react'
import { formatAgeHe, getSlaView } from '@/modules/tickets/sla-display'
import { SlaValue } from '@/components/ui/signal'
import { cn } from '@/lib/utils'

/**
 * One interval for the whole page. A 30-row queue with 30 live SLA cells must
 * not create 30 timers.
 */
const subscribers = new Set<(now: Date) => void>()
let timer: ReturnType<typeof setInterval> | null = null

function subscribe(fn: (now: Date) => void) {
  subscribers.add(fn)
  if (!timer) {
    timer = setInterval(() => {
      const now = new Date()
      subscribers.forEach((s) => s(now))
    }, 30_000)
  }
  return () => {
    subscribers.delete(fn)
    if (subscribers.size === 0 && timer) {
      clearInterval(timer)
      timer = null
    }
  }
}

function useTick(): Date | null {
  const [now, setNow] = useState<Date | null>(null)
  useEffect(() => {
    setNow(new Date())
    return subscribe(setNow)
  }, [])
  return now
}

type SlaInput = {
  priority?: string | null
  status?: string | null
  sla_respond_by?: string | null
  sla_resolve_by?: string | null
  first_response_at?: string | null
  resolved_at?: string | null
  created_at?: string | null
}

/**
 * Server renders the value from server time; the client re-computes on mount
 * and every 30s. `suppressHydrationWarning` covers the unavoidable one-render
 * clock skew between the two.
 */
export function LiveSla({
  ticket,
  className,
}: {
  ticket: SlaInput
  className?: string
}) {
  const now = useTick()
  const view = getSlaView({ ...ticket, now: now ?? undefined })
  return (
    <span suppressHydrationWarning data-live="sla" className="live-sla">
      <SlaValue view={view} className={className} />
    </span>
  )
}

export function LiveAge({
  createdAt,
  className,
}: {
  createdAt: string
  className?: string
}) {
  const now = useTick()
  return (
    <span
      suppressHydrationWarning
      data-live="age"
      className={cn('live-age t-meta t-num text-ink-3', className)}
    >
      {formatAgeHe(createdAt, now ?? undefined)}
    </span>
  )
}

```
### `src/components/ui/timeline.tsx`

```tsx
import { ArrowLeft, MessageSquare, Send, StickyNote, Activity } from 'lucide-react'
import type { ActivityItem } from '@/modules/tickets/activity'
import { EmptyState } from '@/components/ui/primitives'
import { cn } from '@/lib/utils'

/**
 * One chronology. Messages and events were two separate cards, which forced the
 * operator to reconstruct order in their head. Operationally they are a single
 * story: what the store said, what the system did, what the technician found.
 */

function timeOf(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  try {
    return new Intl.DateTimeFormat('he-IL', {
      timeZone: 'Asia/Jerusalem',
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).format(d)
  } catch {
    return '—'
  }
}

function iconFor(kind: ActivityItem['kind']) {
  switch (kind) {
    case 'message_in':
      return MessageSquare
    case 'message_out':
      return Send
    case 'note':
      return StickyNote
    default:
      return Activity
  }
}

export function Timeline({ items }: { items: ActivityItem[] }) {
  if (items.length === 0) {
    return <EmptyState title="אין פעילות" />
  }

  return (
    <ol className="relative px-4 py-3">
      {/* Spine sits on the inline-start edge and mirrors under LTR. */}
      <span
        aria-hidden
        className="absolute inset-block-0 bottom-3 top-3 w-px bg-border start-[27px]"
      />
      {items.map((item) => {
        const Icon = iconFor(item.kind)
        const isInbound = item.kind === 'message_in'
        return (
          <li
            key={item.id}
            className="relative flex gap-3 py-2.5 ps-0"
            data-activity-kind={item.kind}
          >
            <span
              className={cn(
                'relative z-10 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border',
                isInbound
                  ? 'border-border bg-surface text-ink'
                  : 'border-border bg-canvas text-ink-3',
              )}
            >
              <Icon className="h-3 w-3" aria-hidden />
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="t-body-strong text-ink">{item.label}</span>
                <span className="t-caption t-num text-ink-3">
                  {timeOf(item.at)}
                </span>
              </div>

              {item.transition?.to ? (
                <p className="t-body mt-0.5 flex items-center gap-1.5 text-ink-2">
                  {item.transition.from ? (
                    <>
                      <span>{item.transition.from}</span>
                      <ArrowLeft className="h-3 w-3 shrink-0 ltr:rotate-180" aria-hidden />
                    </>
                  ) : null}
                  <span className="text-ink">{item.transition.to}</span>
                </p>
              ) : null}

              {item.body ? (
                <p
                  className={cn(
                    't-body mt-1 whitespace-pre-wrap break-words',
                    isInbound ? 'text-ink' : 'text-ink-2',
                  )}
                >
                  {item.body}
                </p>
              ) : null}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

```
### `src/components/ui/toast.tsx`

```tsx
'use client'

import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Check, TriangleAlert } from 'lucide-react'
import { cn } from '@/lib/utils'

type Tone = 'neutral' | 'success' | 'critical'
type ToastItem = {
  id: string
  title: string
  tone?: Tone
  action?: { label: string; onClick: () => void }
}

const ToastCtx = createContext<{
  push: (t: Omit<ToastItem, 'id'>) => void
} | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const pathname = usePathname() ?? ''
  const isTechRoute = pathname.startsWith('/tech')

  const push = useCallback((t: Omit<ToastItem, 'id'>) => {
    const id = Math.random().toString(36).slice(2)
    setItems((prev) => [...prev, { ...t, id }])
    setTimeout(() => setItems((prev) => prev.filter((x) => x.id !== id)), 4500)
  }, [])

  const value = useMemo(() => ({ push }), [push])

  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className={cn(
          'pointer-events-none fixed inset-x-4 z-[60] flex flex-col items-center gap-2.5 md:inset-x-auto md:bottom-6 md:items-start md:start-6',
          isTechRoute
            ? 'bottom-[calc(var(--safe-b)+16px)]'
            : 'bottom-[calc(var(--bottomnav-h)+var(--safe-b)+16px)] max-md:bottom-[calc(var(--bottomnav-h)+var(--safe-b)+16px)]',
        )}
      >
        {items.map((t) => (
          <div
            key={t.id}
            className={cn(
              't-body animate-slide-up pointer-events-auto flex w-full max-w-sm items-center gap-2.5 rounded-[var(--radius-lg)] border bg-surface px-4 py-3 shadow-[var(--shadow-pop)] md:w-auto',
              t.tone === 'success' && 'border-[var(--signal-resolved)]/30',
              t.tone === 'critical' && 'border-[var(--signal-critical-line)]',
              (!t.tone || t.tone === 'neutral') && 'border-border',
            )}
          >
            {t.tone === 'success' ? (
              <Check
                aria-hidden
                className="h-4 w-4 shrink-0 text-[var(--signal-resolved)]"
              />
            ) : null}
            {t.tone === 'critical' ? (
              <TriangleAlert
                aria-hidden
                className="h-4 w-4 shrink-0 text-[var(--signal-critical)]"
              />
            ) : null}
            <span className="min-w-0 flex-1 text-ink">{t.title}</span>
            {t.action ? (
              <button
                type="button"
                onClick={() => {
                  t.action!.onClick()
                  setItems((prev) => prev.filter((x) => x.id !== t.id))
                }}
                className="t-caption shrink-0 text-[var(--tenant)] hover:underline"
              >
                {t.action.label}
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastCtx)
  if (!ctx) return { push: () => undefined }
  return ctx
}

```
### `src/components/ui/whatsapp-share-button.tsx`

```tsx
'use client'

import { Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { whatsAppShareUrl } from '@/modules/stores/whatsapp-link'
import { cn } from '@/lib/utils'

type Props = {
  prefillText: string
  /** Digits-only business phone from server when env is empty. */
  businessPhone?: string | null
  label?: string
  className?: string
  size?: 'sm' | 'default'
  variant?: 'primary' | 'secondary'
}

/** Opens wa.me with pre-filled text; Web Share API on mobile when available. */
export function WhatsAppShareButton({
  prefillText,
  businessPhone,
  label = 'שיתוף ב-WhatsApp',
  className,
  size = 'default',
  variant = 'secondary',
}: Props) {
  const url = whatsAppShareUrl(prefillText, businessPhone)

  async function onClick() {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: 'MaintainOS', text: prefillText, url })
        return
      } catch {
        /* user cancelled or unsupported payload */
      }
    }
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size === 'sm' ? 'sm' : undefined}
      className={cn(className)}
      onClick={() => void onClick()}
    >
      <Share2 className="h-4 w-4" aria-hidden />
      {label}
    </Button>
  )
}

```
