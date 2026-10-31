'use client'

import { createContext, useContext, useId, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

const FoldCtx = createContext<{
  openId: string | null
  setOpenId: (id: string | null) => void
} | null>(null)

/** One open section at a time on the phone. Desktop lays the children out flat. */
export function PhoneFoldStack({ children }: { children: React.ReactNode }) {
  const [openId, setOpenId] = useState<string | null>(null)
  return (
    <FoldCtx.Provider value={{ openId, setOpenId }}>
      <div className="flex min-w-0 flex-col gap-2 md:contents">{children}</div>
    </FoldCtx.Provider>
  )
}

export function PhoneFold({
  title,
  summary,
  children,
}: {
  title: string
  summary?: string
  children: React.ReactNode
}) {
  const id = useId()
  const ctx = useContext(FoldCtx)
  const [localOpen, setLocalOpen] = useState(false)
  const open = ctx ? ctx.openId === id : localOpen

  function toggle() {
    if (ctx) ctx.setOpenId(open ? null : id)
    else setLocalOpen((value) => !value)
  }

  return (
    <section className="min-w-0 overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface md:contents">
      <button
        type="button"
        className="flex min-h-14 w-full items-center gap-3 px-4 py-3 text-start md:hidden"
        aria-expanded={open}
        aria-controls={id}
        onClick={toggle}
      >
        <span className="min-w-0 flex-1">
          <span className="t-body-strong block text-ink">{title}</span>
          {summary && !open ? (
            <span className="t-meta mt-0.5 block truncate text-ink-2">{summary}</span>
          ) : null}
        </span>
        <ChevronDown
          className={cn(
            'h-5 w-5 shrink-0 text-ink-3 transition-transform',
            open && 'rotate-180',
          )}
          aria-hidden
        />
      </button>
      <div
        id={id}
        className={cn(
          'phone-fold-body min-w-0 md:contents',
          open
            ? 'max-md:flex max-md:flex-col max-md:gap-3 max-md:px-3 max-md:pb-3 max-md:[&>section]:border-0 max-md:[&>section]:bg-transparent max-md:[&>section]:p-3 max-md:[&>section]:shadow-none'
            : 'max-md:hidden',
        )}
      >
        {children}
      </div>
    </section>
  )
}
