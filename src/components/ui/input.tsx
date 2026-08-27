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
