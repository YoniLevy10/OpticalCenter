import { createHmac, timingSafeEqual } from 'node:crypto'

function isProdLike() {
  // Explicit test/ops override — avoids mutating read-only NODE_ENV in Vitest
  if (process.env.MAINTAINOS_WA_PROD_STRICT === '1') return true
  return (
    process.env.NODE_ENV === 'production' &&
    process.env.MAINTAINOS_FORCE_MEMORY !== '1' &&
    process.env.MAINTAINOS_WA_DEV_BYPASS !== '1'
  )
}

/**
 * Verify Meta X-Hub-Signature-256.
 * Production: WHATSAPP_APP_SECRET required; unsigned → reject.
 * Dev/demo: secret optional (explicit dry-run / local bypass).
 */
export function verifyWhatsAppSignature(
  rawBody: string,
  signatureHeader: string | null,
): boolean {
  const secret =
    process.env.WHATSAPP_APP_SECRET || process.env.WA_APP_SECRET

  if (!secret) {
    if (isProdLike()) return false
    return true
  }
  if (!signatureHeader?.startsWith('sha256=')) return false
  const expected = createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex')
  const received = signatureHeader.slice('sha256='.length)
  try {
    const a = Buffer.from(expected, 'utf8')
    const b = Buffer.from(received, 'utf8')
    if (a.length !== b.length) return false
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}

export function whatsappSecretConfigured(): boolean {
  return Boolean(process.env.WHATSAPP_APP_SECRET || process.env.WA_APP_SECRET)
}
