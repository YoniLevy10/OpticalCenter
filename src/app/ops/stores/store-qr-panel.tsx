'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Notice } from '@/components/ui/primitives'
import { storeWhatsAppPrefill } from '@/modules/tickets/constants'

/**
 * Store QR panel — server already resolved the business phone.
 * Renders PNG immediately (no client fetch) so QR works even if JS is slow.
 */
export function StoreQrPanel({
  code,
  deepLink,
}: {
  code: string
  /** Server-resolved wa.me link, or null when phone is missing. */
  deepLink: string | null
}) {
  if (!deepLink) {
    return (
      <div className="flex flex-col gap-3 p-4">
        <Notice tone="warning">
          <span className="t-body-strong block">לא ניתן ליצור QR</span>
          חסר מספר WhatsApp עסקי. הגדירו ב־Ops → הגדרות → WhatsApp ואז רעננו
          את העמוד.
        </Notice>
        <Button asChild variant="secondary" size="sm" className="self-start">
          <Link href="/ops/settings">מעבר להגדרות WhatsApp</Link>
        </Button>
      </div>
    )
  }

  const pngSrc = `/api/stores/qr?code=${encodeURIComponent(code)}&format=png`

  return (
    <div className="flex flex-col items-center gap-4 p-6">
      <a
        href={deepLink}
        target="_blank"
        rel="noopener noreferrer"
        title="פתיחת קישור NFC / WhatsApp"
        aria-label={`קישור NFC לסניף ${code}`}
        className="rounded-[var(--radius-md)] outline-none ring-[var(--tenant)] transition-opacity hover:opacity-90 focus-visible:ring-2"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={pngSrc}
          alt={`QR לסניף ${code}`}
          width={192}
          height={192}
          className="h-48 w-48 rounded-[var(--radius-md)] border border-border bg-surface p-2"
        />
      </a>
      <div className="flex flex-wrap justify-center gap-2">
        <Button asChild variant="secondary" size="sm">
          <a
            href={`/api/stores/qr?code=${encodeURIComponent(code)}&format=png&download=1`}
            download={`store-${code}-qr.png`}
          >
            הורדת PNG
          </a>
        </Button>
        <Button asChild variant="secondary" size="sm">
          <a
            href={`/api/stores/qr?code=${encodeURIComponent(code)}&format=svg&download=1`}
            download={`store-${code}-qr.svg`}
          >
            הורדת SVG
          </a>
        </Button>
        <Button asChild variant="primary" size="sm">
          <a href={deepLink} target="_blank" rel="noopener noreferrer">
            בדיקת קישור WhatsApp
          </a>
        </Button>
      </div>
      <p className="t-caption max-w-sm text-center text-ink-3">
        לחיצה על ה־QR או סריקה פותחת WhatsApp עם{' '}
        <span className="t-num" dir="ltr">
          {storeWhatsAppPrefill(code)}
        </span>
        . אותו קישור משמש גם ל־NFC.
      </p>
      <p
        dir="ltr"
        className="t-caption t-num max-w-full break-all text-center text-ink-3"
      >
        {deepLink}
      </p>
    </div>
  )
}
