'use client'

import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { cn } from '@/lib/utils'

type ToastItem = { id: string; title: string; tone?: 'neutral' | 'success' | 'danger' }

const ToastCtx = createContext<{
  push: (t: Omit<ToastItem, 'id'>) => void
} | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const push = useCallback((t: Omit<ToastItem, 'id'>) => {
    const id = Math.random().toString(36).slice(2)
    setItems((prev) => [...prev, { ...t, id }])
    setTimeout(() => {
      setItems((prev) => prev.filter((x) => x.id !== id))
    }, 2800)
  }, [])
  const value = useMemo(() => ({ push }), [push])
  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-4 start-4 z-[60] flex w-[min(92vw,320px)] flex-col gap-2">
        {items.map((t) => (
          <div
            key={t.id}
            className={cn(
              'rounded-[var(--radius-md)] border border-border bg-surface px-3 py-2 text-[13px] shadow-[var(--shadow-modal)]',
              t.tone === 'success' && 'border-success/20',
              t.tone === 'danger' && 'border-danger/20',
            )}
          >
            {t.title}
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
