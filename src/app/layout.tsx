import type { Metadata, Viewport } from 'next'
import Script from 'next/script'
import { Heebo, Rubik } from 'next/font/google'
import { ThemeProvider } from '@/components/theme/theme-provider'
import { ToastProvider } from '@/components/ui/toast'
import { LocaleProvider } from '@/components/i18n/locale-provider'
import { THEME_BOOT_SCRIPT } from '@/lib/theme'
import { getLocale } from '@/lib/i18n/server'
import { localeDir, localeHtmlLang } from '@/lib/i18n/locale'
import './globals.css'

const heebo = Heebo({
  subsets: ['hebrew', 'latin'],
  variable: '--font-heebo',
  display: 'swap',
})

/** Variable face — avoids brittle per-weight Google CSS fetches in CI. */
const rubik = Rubik({
  subsets: ['hebrew', 'latin'],
  variable: '--font-rubik',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'OPC — מערכת תפעול לרשתות',
    template: '%s · OPC',
  },
  description: 'מערכת תפעול לרשתות מרובות סניפים. OPC נמצאת בשלבי פיתוח.',
  manifest: '/manifest.webmanifest',
  applicationName: 'OPC',
  appleWebApp: {
    capable: true,
    title: 'OPC',
    statusBarStyle: 'default',
  },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icons/icon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
    shortcut: ['/icons/apple-touch-icon.png'],
  },
  openGraph: {
    type: 'website',
    locale: 'he_IL',
    title: 'OPC — מערכת תפעולית לרשתות מרובות סניפים',
    description: 'חיבור בין דיווח, טיפול ותמונה תפעולית ברשת. נמצאת בשלבי פיתוח.',
  },
}

export const viewport: Viewport = {
  /* Status-bar chrome; ThemeProvider updates meta theme-color at runtime. */
  themeColor: '#f4f0ea',
  width: 'device-width',
  initialScale: 1,
  /* Required for safe-area insets to resolve in standalone PWA mode. */
  viewportFit: 'cover',
  interactiveWidget: 'resizes-content',
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale()
  return (
    <html lang={localeHtmlLang(locale)} dir={localeDir(locale)} suppressHydrationWarning>
      <body className={`${heebo.variable} ${rubik.variable} font-sans antialiased`}>
        <Script
          id="maintainos-theme-boot"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }}
        />
        <LocaleProvider locale={locale}>
          <ThemeProvider>
            <ToastProvider>{children}</ToastProvider>
          </ThemeProvider>
        </LocaleProvider>
        <script
          dangerouslySetInnerHTML={{
            __html: `if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>{}))}`,
          }}
        />
      </body>
    </html>
  )
}
