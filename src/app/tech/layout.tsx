import type { Metadata, Viewport } from 'next'

export const metadata: Metadata = {
  title: 'MaintainOS · טכנאי',
  description: 'פורטל טכנאי — Optical Center ישראל',
  manifest: '/manifest-tech.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'MaintainOS טכנאי',
    statusBarStyle: 'default',
  },
}

export const viewport: Viewport = {
  themeColor: '#8b1e2d',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function TechLayout({ children }: { children: React.ReactNode }) {
  return children
}
