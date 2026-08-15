import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * Verify Meta X-Hub-Signature-256 when WHATSAPP_APP_SECRET is set.
 * Returns true when secret is unset (dev / optional).
 */
export function verifyWhatsAppSignature(
  rawBody: string,
  signatureHeader: string | null,
): boolean {
  const secret =
    process.env.WHATSAPP_APP_SECRET || process.env.WA_APP_SECRET
  if (!secret) return true
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
