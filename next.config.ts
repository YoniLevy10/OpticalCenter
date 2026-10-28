import type { NextConfig } from 'next'

/**
 * Dev-only host allowlist for the Base44 sandbox preview.
 * The preview proxy serves the app from `3000-<public suffix>` while the
 * sandbox itself receives `*.<sandbox host domain>`; Next gates dev assets
 * and HMR on the request Origin. Enabled only when BASE44_PREVIEW_MODE=1.
 */
const previewMode = process.env.BASE44_PREVIEW_MODE === '1'
const allowedDevOrigins: string[] = []
if (previewMode) {
  if (process.env.BASE44_PUBLIC_HOST_SUFFIX) {
    allowedDevOrigins.push(`3000-${process.env.BASE44_PUBLIC_HOST_SUFFIX}`)
  }
  if (process.env.BASE44_SANDBOX_HOST_DOMAIN) {
    allowedDevOrigins.push(`*.${process.env.BASE44_SANDBOX_HOST_DOMAIN}`)
  }
}

const nextConfig: NextConfig = {
  ...(allowedDevOrigins.length > 0 ? { allowedDevOrigins } : {}),
}

export default nextConfig
