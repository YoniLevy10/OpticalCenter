'use client'

import { useState } from 'react'
import { ChevronDown, QrCode } from 'lucide-react'
import { usePhrase } from '@/components/i18n/locale-provider'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type StoreQrItem = {
  id: string
  code: string
  name: string
  deepLink: string | null
}

/**
 * Per-store QR accordion — expand one branch at a time to preview / download.
 */
export function StoreQrAccordion({ stores }: { stores: StoreQrItem[] }) {
  const [openId, setOpenId] = useState<string | null>(null)
  const p = usePhrase()

  if (stores.length === 0) return null

  return (
    <section className="flex flex-col gap-2" aria-label={p('QR לפי סניף')}>
      <h2 className="t-section text-ink">{p('QR לפי סניף')}</h2>
      <p className="t-caption text-ink-3">
        {p('פתחו סניף כדי להציג QR, להוריד PNG או לבדוק את קישור ה־WhatsApp.')}
      </p>
      <ul className="overflow-hidden rounded-[var(--radius-lg)] border border-border/80 bg-surface divide-y divide-border">
        {stores.map((s) => {
          const open = openId === s.id
          const pngSrc = `/api/stores/qr?code=${encodeURIComponent(s.code)}&format=png`
          return (
            <li key={s.id}>
              <button
                type="button"
                aria-expanded={open}
                onClick={() => setOpenId(open ? null : s.id)}
                className="flex min-h-[var(--tap)] w-full items-center gap-3 px-4 py-3 text-start transition-colors hover:bg-surface-sunken/40"
              >
                <QrCode
                  className="h-4 w-4 shrink-0 text-ink-3"
                  aria-hidden
                />
                <span className="min-w-0 flex-1">
                  <span className="t-body-strong block truncate text-ink">
                    {s.name}
                  </span>
                  <span className="t-caption t-num text-ink-3">#{s.code}</span>
                </span>
                <ChevronDown
                  className={cn(
                    'h-4 w-4 shrink-0 text-ink-3 transition-transform duration-[var(--dur-2)]',
                    open && 'rotate-180',
                  )}
                  aria-hidden
                />
              </button>
              {open ? (
                <div className="flex flex-col items-center gap-3 border-t border-border/60 bg-surface-sunken/30 px-4 py-4">
                  {!s.deepLink ? (
                    <p className="t-body text-ink-2">
                      {p('חסר מספר WhatsApp עסקי — הגדירו בהגדרות.')}
                    </p>
                  ) : (
                    <>
                      <a
                        href={s.deepLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`קישור WhatsApp לסניף ${s.code}`}
                        className="rounded-[var(--radius-md)] outline-none ring-[var(--tenant)] focus-visible:ring-2"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={pngSrc}
                          alt={`QR לסניף ${s.code}`}
                          width={160}
                          height={160}
                          className="h-40 w-40 rounded-[var(--radius-md)] border border-border bg-surface p-2"
                        />
                      </a>
                      <div className="flex flex-wrap justify-center gap-2">
                        <Button asChild variant="secondary" size="sm">
                          <a
                            href={`/api/stores/qr?code=${encodeURIComponent(s.code)}&format=png&download=1`}
                            download={`store-${s.code}-qr.png`}
                          >
                            {p('הורדת PNG')}
                          </a>
                        </Button>
                        <Button asChild variant="primary" size="sm">
                          <a
                            href={s.deepLink}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {p('בדיקת קישור')}
                          </a>
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ) : null}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
