'use client'

import { useEffect, useRef, useState } from 'react'
import { SearchField } from '@/components/ui/input'

function normalize(value: string) {
  return value
    .replace(/[\u0591-\u05C7]/g, '')
    .replace(/כיכר/g, 'ככר')
    .replace(/קריית/g, 'קרית')
    .replace(/שנקין/g, 'שינקין')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

function resultLabel(count: number, one: string, many: string) {
  if (count === 0) return 'אין תוצאות'
  if (count === 1) return one
  return `${count} ${many}`
}

/** Filters a rendered list by store, title, or document name. `/` focuses the field. */
export function ListFinder({
  placeholder,
  one,
  many,
  children,
  className,
}: {
  placeholder: string
  one: string
  many: string
  children: React.ReactNode
  className?: string
}) {
  const root = useRef<HTMLDivElement>(null)
  const opened = useRef(new Set<string>())
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')

  useEffect(() => {
    const host = root.current
    if (!host) return
    const needle = normalize(query)
    const groups = [...host.querySelectorAll<HTMLElement>('[data-find-group]')]
    if (!needle) {
      for (const group of groups) {
        group.hidden = false
        for (const item of group.querySelectorAll<HTMLElement>('[data-find-item]')) {
          item.hidden = false
        }
        const key = group.dataset.findKey
        if (key && opened.current.has(key) && group instanceof HTMLDetailsElement) {
          group.open = false
        }
      }
      opened.current.clear()
      setStatus('')
      return
    }

    let shown = 0
    for (const group of groups) {
      const key = group.dataset.findKey || ''
      const groupHit = normalize(group.dataset.find || '').includes(needle)
      const items = [...group.querySelectorAll<HTMLElement>('[data-find-item]')]
      let itemHit = false
      for (const item of items) {
        const hit = groupHit || normalize(item.dataset.find || '').includes(needle)
        item.hidden = !hit
        if (hit) itemHit = true
      }
      const show = groupHit || itemHit || (items.length === 0 && groupHit)
      group.hidden = !show
      if (show) shown += 1
      if (group instanceof HTMLDetailsElement) {
        if (show) {
          group.open = true
          opened.current.add(key)
        } else {
          group.open = false
        }
      }
    }
    setStatus(resultLabel(shown, one, many))
  }, [query, one, many])

  return (
    <div className="flex flex-col gap-3">
      <SearchField
        value={query}
        onValueChange={setQuery}
        placeholder={placeholder}
        autoFocusKey="/"
        className="w-full"
      />
      <p role="status" aria-live="polite" className="t-meta text-ink-2">
        {status}
      </p>
      <div ref={root} className={className}>
        {children}
      </div>
    </div>
  )
}
