'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

export type VisitSelectableTicket = {
  id: string
  storeCode: string
  storeId: string
  label: string
}

type VisitSelectionContextValue = {
  selected: Set<string>
  toggle: (id: string) => void
  clear: () => void
  ticketsById: Map<string, VisitSelectableTicket>
}

const VisitSelectionContext = createContext<VisitSelectionContextValue | null>(
  null,
)

export function VisitSelectionProvider({
  tickets,
  children,
}: {
  tickets: VisitSelectableTicket[]
  children: ReactNode
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const ticketsById = useMemo(
    () => new Map(tickets.map((t) => [t.id, t])),
    [tickets],
  )

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const clear = useCallback(() => setSelected(new Set()), [])

  const value = useMemo(
    () => ({ selected, toggle, clear, ticketsById }),
    [selected, toggle, clear, ticketsById],
  )

  return (
    <VisitSelectionContext.Provider value={value}>
      {children}
    </VisitSelectionContext.Provider>
  )
}

export function useVisitSelection() {
  return useContext(VisitSelectionContext)
}
