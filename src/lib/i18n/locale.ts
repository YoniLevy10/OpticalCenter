export const LOCALES = ['he', 'en', 'fr'] as const
export type Locale = (typeof LOCALES)[number]

export const LOCALE_COOKIE = 'mos_locale'

export const LOCALE_SHORT: Record<Locale, string> = {
  he: 'עב',
  en: 'EN',
  fr: 'FR',
}

export function parseLocale(value: string | null | undefined): Locale {
  if (value === 'en' || value === 'fr' || value === 'he') return value
  return 'he'
}

export function localeDir(locale: Locale): 'rtl' | 'ltr' {
  return locale === 'he' ? 'rtl' : 'ltr'
}

export function localeHtmlLang(locale: Locale): string {
  if (locale === 'he') return 'he'
  if (locale === 'fr') return 'fr'
  return 'en'
}
