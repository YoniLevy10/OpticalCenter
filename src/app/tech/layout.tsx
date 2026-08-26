import type { Metadata, Viewport } from 'next'

/**
 * The technician PWA is a separate installable app with its own scope and
 * manifest — a field worker installs "טכנאי", not the HQ console.
 */
export const metadata: Metadata = {
  title: 'MaintainOS · טכנאי',
  description: 'פורטל טכנאי — Optical Center ישראל',
  manifest: '/manifest-tech.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'טכנאי',
    statusBarStyle: 'default',
  },
}

export const viewport: Viewport = {
  themeColor: '#ffffff',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function TechLayout({ children }: { children: React.ReactNode }) {
  return children
}
