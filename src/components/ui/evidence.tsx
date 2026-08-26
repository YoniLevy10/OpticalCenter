'use client'

import { useState } from 'react'
import { ImageOff, Paperclip } from 'lucide-react'
import { Modal } from '@/components/ui/overlay'
import { cn } from '@/lib/utils'

export type Attachment = {
  id: string
  url: string
  kind?: string | null
}

function isImage(a: Attachment): boolean {
  if (a.kind === 'video') return false
  if (a.kind && a.kind !== 'image') return false
  return true
}

function isVideo(a: Attachment): boolean {
  return a.kind === 'video' || /\.(mp4|webm)(\?|$)/i.test(a.url)
}

/**
 * HQ must be able to inspect what the store actually photographed. Raw URLs
 * were never the UX. Uses plain <img> — attachment URLs are arbitrary remote
 * hosts and next/image would require per-tenant domain allow-listing.
 */
export function EvidenceGrid({
  attachments,
  className,
}: {
  attachments: Attachment[]
  className?: string
}) {
  const [active, setActive] = useState<Attachment | null>(null)
  const [failed, setFailed] = useState<Set<string>>(new Set())

  if (attachments.length === 0) return null

  const images = attachments.filter((a) => isImage(a) && !isVideo(a))
  const videos = attachments.filter(isVideo)
  const files = attachments.filter((a) => !isImage(a) && !isVideo(a))

  return (
    <div className={className}>
      {images.length > 0 ? (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {images.map((a) => {
            const broken = failed.has(a.id)
            return (
              <li key={a.id}>
                <button
                  type="button"
                  aria-label="הגדלת תמונה"
                  onClick={() => !broken && setActive(a)}
                  className={cn(
                    'relative block aspect-square w-full overflow-hidden rounded-[var(--radius-md)] border border-border bg-sunken transition-opacity duration-[var(--dur-1)]',
                    !broken && 'hover:opacity-90',
                  )}
                >
                  {broken ? (
                    <span className="flex h-full w-full items-center justify-center">
                      <ImageOff className="h-4 w-4 text-ink-3" aria-hidden />
                    </span>
                  ) : (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={a.url}
                      alt="תיעוד מהשטח"
                      loading="lazy"
                      className="h-full w-full object-cover"
                      onError={() =>
                        setFailed((prev) => new Set(prev).add(a.id))
                      }
                    />
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      ) : null}

      {videos.length > 0 ? (
        <ul className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {videos.map((a) => (
            <li key={a.id}>
              <video
                src={a.url}
                controls
                className="max-h-48 w-full rounded-[var(--radius-md)] border border-border bg-black"
              />
            </li>
          ))}
        </ul>
      ) : null}

      {files.length > 0 ? (
        <ul className="mt-2 space-y-1">
          {files.map((a) => (
            <li key={a.id}>
              <a
                href={a.url}
                target="_blank"
                rel="noreferrer"
                className="t-body inline-flex items-center gap-1.5 text-ink-2 hover:text-ink"
              >
                <Paperclip className="h-3.5 w-3.5" aria-hidden />
                קובץ מצורף
              </a>
            </li>
          ))}
        </ul>
      ) : null}

      <Modal
        open={Boolean(active)}
        onOpenChange={(v) => !v && setActive(null)}
        title="תיעוד מהשטח"
        className="w-[min(94vw,720px)]"
      >
        {active ? (
          <div className="space-y-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={active.url}
              alt="תיעוד מהשטח"
              className="max-h-[70dvh] w-full rounded-[var(--radius-md)] object-contain"
            />
            <a
              href={active.url}
              target="_blank"
              rel="noreferrer"
              dir="ltr"
              className="t-caption block truncate text-ink-3 hover:text-ink-2"
            >
              {active.url}
            </a>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
