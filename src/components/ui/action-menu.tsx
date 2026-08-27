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
              return (
                <a
                  key={item.key}
                  role="menuitem"
                  href={item.href}
                  className={classNameItem}
                  onClick={() => setOpen(false)}
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
