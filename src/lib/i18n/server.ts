import { cookies } from 'next/headers'
import { LOCALE_COOKIE, parseLocale, type Locale } from '@/lib/i18n/locale'

export async function getLocale(): Promise<Locale> {
  const jar = await cookies()
  return parseLocale(jar.get(LOCALE_COOKIE)?.value)
}
