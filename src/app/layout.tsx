import type { Metadata, Viewport } from 'next'
import { Heebo } from 'next/font/google'
import { ToastProvider } from '@/components/ui/toast'
import './globals.css'

const heebo = Heebo({
  subsets: ['hebrew', 'latin'],
  variable: '--font-heebo',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'MaintainOS',
  description: 'מערכת דיווח וניהול תקלות לרשתות קמעונאיות',
  manifest: '/manifest.webmanifest',
  applicationName: 'MaintainOS',
  appleWebApp: {
    capable: true,
    title: 'MaintainOS',
    statusBarStyle: 'default',
  },
  formatDetection: { telephone: false },
}

export const viewport: Viewport = {
  /* Status-bar chrome; splash/canvas uses Pulse #f5f6fa via manifests. */
  themeColor: '#ffffff',
  width: 'device-width',
  initialScale: 1,
  /* Required for safe-area insets to resolve in standalone PWA mode. */
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="he" dir="rtl">
      <body className={`${heebo.variable} font-sans antialiased`}>
        <a
          href="#main-content"
          className="sr-only focus:fixed focus:start-4 focus:top-4 focus:z-50 focus:rounded-[var(--radius-md)] focus:bg-surface focus:px-4 focus:py-2 focus:shadow-[var(--shadow-modal)]"
        >
          דלג לתוכן
        </a>
        <ToastProvider>{children}</ToastProvider>
        <script
          dangerouslySetInnerHTML={{
            __html: `if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>{}))}`,
          }}
        />
      </body>
    </html>
  )
}
