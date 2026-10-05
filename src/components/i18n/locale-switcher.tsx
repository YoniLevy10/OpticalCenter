'use client'

import { LOCALES, LOCALE_SHORT } from '@/lib/i18n/locale'
import { useLocale } from '@/components/i18n/locale-provider'
import { cn } from '@/lib/utils'

export function LocaleSwitcher({
  className,
  tone = 'default',
}: {
  className?: string
  tone?: 'default' | 'onDark'
}) {
  const { locale, setLocale, t } = useLocale()
  const onDark = tone === 'onDark'

  return (
    <div
      role="group"
      aria-label={t('nav.language')}
      className={cn('flex items-center gap-1', className)}
    >
      {LOCALES.map((code) => {
        const active = code === locale
        return (
          <button
            key={code}
            type="button"
            aria-pressed={active}
            onClick={() => setLocale(code)}
            className={cn(
              't-caption rounded-[var(--radius-sm)] px-2 py-1 transition-colors',
              onDark
                ? active
                  ? 'bg-white/15 text-white'
                  : 'text-white/60 hover:bg-white/10 hover:text-white'
                : active
                  ? 'bg-[var(--tenant-soft)] text-[var(--tenant)]'
                  : 'text-ink-3 hover:bg-surface-sunken hover:text-ink',
            )}
          >
            {LOCALE_SHORT[code]}
          </button>
        )
      })}
    </div>
  )
}
