'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Bell, X } from 'lucide-react'
import { usePhrase } from '@/components/i18n/locale-provider'
import type { DeskBundle } from '@/modules/ops/desk-notices'

/** Bell beside the control-center label. The suggestions open in a small panel. */
export function DeskBell({ label, items }: { label: string; items: DeskBundle[] }) {
  const p = usePhrase()
  const pathname = usePathname()
  const titleId = useId()
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [place, setPlace] = useState<{ top: number; right: number } | null>(null)
  const count = items.length
  const shown = count > 99 ? '99+' : String(count)

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!open) return
    function move() {
      const button = buttonRef.current
      if (!button) return
      const rect = button.getBoundingClientRect()
      setPlace({
        top: rect.bottom + 8,
        right: Math.max(12, window.innerWidth - rect.right),
      })
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    function onPointer(event: MouseEvent) {
      const target = event.target
      if (!(target instanceof Node)) return
      if (buttonRef.current?.contains(target) || panelRef.current?.contains(target)) return
      setOpen(false)
    }
    move()
    window.addEventListener('resize', move)
    window.addEventListener('scroll', move, true)
    window.addEventListener('keydown', onKey)
    window.addEventListener('mousedown', onPointer)
    return () => {
      window.removeEventListener('resize', move)
      window.removeEventListener('scroll', move, true)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('mousedown', onPointer)
    }
  }, [open])

  return (
    <div className="mb-2 flex items-center gap-1.5 px-2.5">
      <p className="t-caption text-ink-3">{label}</p>
      {count > 0 ? (
        <button
          ref={buttonRef}
          type="button"
          className="relative inline-flex h-5 w-5 items-center justify-center text-[var(--signal-critical)]"
          aria-expanded={open}
          aria-haspopup="dialog"
          aria-label={p(`${count} הצעות לביקור`)}
          onClick={() => setOpen((current) => !current)}
        >
          <Bell className="h-3.5 w-3.5" aria-hidden />
          <span className="nav-alert nav-alert-dot" aria-hidden>
            {shown}
          </span>
        </button>
      ) : null}
      {open && place
        ? createPortal(
            <div
              ref={panelRef}
              role="dialog"
              aria-labelledby={titleId}
              className="desk-suggest"
              style={{ top: place.top, right: place.right }}
            >
              <div className="desk-suggest-head">
                <h2 id={titleId} className="t-section text-ink">
                  {p('הצעות לביקור')}
                </h2>
                <button
                  type="button"
                  aria-label={p('סגירה')}
                  className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] text-ink-3 hover:bg-surface-sunken hover:text-ink"
                  onClick={() => setOpen(false)}
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </div>
              <ul className="desk-suggest-list">
                {items.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} className="desk-suggest-card" onClick={() => setOpen(false)}>
                      <span className="desk-suggest-store">{item.storeName}</span>
                      <span className="desk-suggest-line">{suggestionLine(item.extra)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}

function suggestionLine(extra: number) {
  if (extra === 1) return 'אפשר לסגור גם תקלה לא דחופה אחת באותו ביקור'
  return `אפשר לסגור גם ${extra} תקלות לא דחופות באותו ביקור`
}
