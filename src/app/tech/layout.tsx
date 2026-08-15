import type { Metadata, Viewport } from 'next'

export const metadata: Metadata = {
  title: 'MaintainOS · טכנאי',
  description: 'פורטל טכנאי — Optical Center ישראל',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'MaintainOS טכנאי',
    statusBarStyle: 'default',
  },
}

export const viewport: Viewport = {
  themeColor: '#18181b',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function TechLayout({ children }: { children: React.ReactNode }) {
  return children
}
