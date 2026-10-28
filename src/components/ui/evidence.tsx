'use client'

import { useState } from 'react'
import { ImageOff, Paperclip } from 'lucide-react'
import { Modal } from '@/components/ui/overlay'
import { cn } from '@/lib/utils'

export type Attachment = {
  id: string
  url: string
  kind?: string | null
  proof_role?: string | null
}

function proofCaption(kind?: string | null): string | null {
  if (kind === 'proof_before') return 'לפני'
  if (kind === 'proof_after') return 'אחרי'
  return null
}

function isImage(a: Attachment): boolean {
  if (isVideo(a)) return false
  if (!a.kind || a.kind === 'image' || a.kind === 'proof_before' || a.kind === 'proof_after') {
    return true
  }
  return false
}

function isVideo(a: Attachment): boolean {
  return a.kind === 'video' || /\.(mp4|webm)(\?|$)/i.test(a.url)
}

function isAudio(a: Attachment): boolean {
  return (
    a.kind === 'audio' ||
    /\.(ogg|mp3|wav|m4a|opus)(\?|$)/i.test(a.url) ||
    a.url.includes('audio/')
  )
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

  const before = attachments.filter((a) => a.proof_role === 'before' || a.kind === 'before')
  const after = attachments.filter((a) => a.proof_role === 'after' || a.kind === 'after')
  const pairedIds = new Set([...before, ...after].map((a) => a.id))
  const rest = attachments.filter((a) => !pairedIds.has(a.id))

  const images = rest.filter(
    (a) => isImage(a) && !isVideo(a) && !isAudio(a),
  )
  const videos = rest.filter(isVideo)
  const audios = rest.filter(isAudio)
  const files = rest.filter(
    (a) => !isImage(a) && !isVideo(a) && !isAudio(a),
  )

  function renderThumb(a: Attachment, label: string) {
    const broken = failed.has(a.id)
    if (isVideo(a)) {
      return (
        <li key={a.id} className="space-y-1">
          <p className="t-meta text-ink-2">{label}</p>
          <video
            src={a.url}
            controls
            className="max-h-40 w-full rounded-[var(--radius-md)] border border-border bg-black"
          />
        </li>
      )
    }
    return (
      <li key={a.id} className="space-y-1">
        <p className="t-meta text-ink-2">{label}</p>
        <button
          type="button"
          aria-label={`הגדלת תמונה — ${label}`}
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
              alt={label}
              loading="lazy"
              className="h-full w-full object-cover"
              onError={() => setFailed((prev) => new Set(prev).add(a.id))}
            />
          )}
        </button>
      </li>
    )
  }

  return (
    <div className={className}>
      {before.length > 0 || after.length > 0 ? (
        <div className="mb-3 grid grid-cols-2 gap-3">
          <ul className="space-y-2">
            {before.length > 0 ? (
              before.map((a) => renderThumb(a, 'לפני'))
            ) : (
              <li className="t-meta text-ink-3">אין תמונת לפני</li>
            )}
          </ul>
          <ul className="space-y-2">
            {after.length > 0 ? (
              after.map((a) => renderThumb(a, 'אחרי'))
            ) : (
              <li className="t-meta text-ink-3">אין תמונת אחרי</li>
            )}
          </ul>
        </div>
      ) : null}

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
                      alt={proofCaption(a.kind) ?? 'תיעוד מהשטח'}
                      loading="lazy"
                      className="h-full w-full object-cover"
                      onError={() =>
                        setFailed((prev) => new Set(prev).add(a.id))
                      }
                    />
                  )}
                  {proofCaption(a.kind) ? (
                    <span className="t-caption pointer-events-none absolute inset-x-1 bottom-1 rounded-[var(--radius-md)] bg-ink px-1.5 py-0.5 text-center text-surface">
                      {proofCaption(a.kind)}
                    </span>
                  ) : null}
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

      {audios.length > 0 ? (
        <ul className="mt-2 space-y-2">
          {audios.map((a) => (
            <li key={a.id}>
              <audio
                src={a.url}
                controls
                className="w-full"
                preload="metadata"
              >
                הדפדפן לא תומך בנגן שמע
              </audio>
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
          <div className="flex flex-col gap-3">
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
