'use client'

import { createContext, useCallback, useContext, useMemo, useState } from 'react'
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
        /* Above bottom nav on mobile only; desktop sits at the corner with no nav offset. */
        className="pointer-events-none fixed inset-x-4 z-[60] flex flex-col items-center gap-2 bottom-[calc(var(--bottomnav-h)+var(--safe-b)+12px)] md:inset-x-auto md:bottom-4 md:items-start md:start-4"
      >
        {items.map((t) => (
          <div
            key={t.id}
            className={cn(
              't-body animate-sheet pointer-events-auto flex w-full max-w-sm items-center gap-2 rounded-[var(--radius-md)] border bg-surface px-3 py-2.5 shadow-[var(--shadow-pop)] md:w-auto',
              t.tone === 'success' && 'border-[var(--signal-resolved)]/25',
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
