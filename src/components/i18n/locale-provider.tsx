'use client'

import { createContext, useContext, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  LOCALE_COOKIE,
  localeDir,
  localeHtmlLang,
  parseLocale,
  type Locale,
} from '@/lib/i18n/locale'
import { translate, type MessageKey } from '@/lib/i18n/messages'
import { phrase } from '@/lib/i18n/phrases'

const LocaleContext = createContext<{
  locale: Locale
  setLocale: (next: Locale) => void
  t: (key: MessageKey, vars?: Record<string, string | number>) => string
} | null>(null)

export function LocaleProvider({
  locale,
  children,
}: {
  locale: Locale
  children: React.ReactNode
}) {
  const router = useRouter()
  const [current, setCurrent] = useState(locale)

  const value = useMemo(
    () => ({
      locale: current,
      setLocale: (next: Locale) => {
        const safe = parseLocale(next)
        document.cookie = `${LOCALE_COOKIE}=${safe};path=/;max-age=31536000;samesite=lax`
        document.documentElement.lang = localeHtmlLang(safe)
        document.documentElement.dir = localeDir(safe)
        setCurrent(safe)
        router.refresh()
      },
      t: (key: MessageKey, vars?: Record<string, string | number>) =>
        translate(current, key, vars),
    }),
    [current, router],
  )

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

export function useLocale() {
  const ctx = useContext(LocaleContext)
  if (!ctx) {
    return {
      locale: 'he' as Locale,
      setLocale: (_next: Locale) => {},
      t: (key: MessageKey, vars?: Record<string, string | number>) =>
        translate('he', key, vars),
    }
  }
  return ctx
}

export function useT() {
  return useLocale().t
}

export function usePhrase() {
  const { locale } = useLocale()
  return (hebrew: string, vars?: Record<string, string | number>) =>
    phrase(locale, hebrew, vars)
}
