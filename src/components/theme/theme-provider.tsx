'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  applyThemeClass,
  readStoredThemePreference,
  resolveDark,
  writeStoredThemePreference,
  type ThemePreference,
} from '@/lib/theme'

type ThemeContextValue = {
  preference: ThemePreference
  resolvedDark: boolean
  setPreference: (next: ThemePreference) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>('auto')
  const [resolvedDark, setResolvedDark] = useState(false)

  const sync = useCallback((pref: ThemePreference) => {
    const dark = resolveDark(pref)
    setResolvedDark(dark)
    applyThemeClass(dark)
  }, [])

  useEffect(() => {
    const stored = readStoredThemePreference()
    setPreferenceState(stored)
    sync(stored)

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        sync(readStoredThemePreference())
      }
    }
    const interval = window.setInterval(() => {
      sync(readStoredThemePreference())
    }, 60_000)

    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.clearInterval(interval)
    }
  }, [sync])

  const setPreference = useCallback(
    (next: ThemePreference) => {
      setPreferenceState(next)
      writeStoredThemePreference(next)
      sync(next)
    },
    [sync],
  )

  const value = useMemo(
    () => ({ preference, resolvedDark, setPreference }),
    [preference, resolvedDark, setPreference],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return ctx
}
