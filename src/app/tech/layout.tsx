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
    title: 'Optical Center · טכנאי',
    statusBarStyle: 'default',
  },
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
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
