/**
 * Media limits aligned with Bamakor public report form.
 */
export const MEDIA_LIMITS = {
  maxFiles: 3,
  maxImageBytes: 5 * 1024 * 1024,
  maxVideoBytes: 15 * 1024 * 1024,
  imageMimes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  videoMimes: ['video/mp4', 'video/webm'],
} as const

export type MediaKind = 'image' | 'video'

export function detectMediaKind(mime: string): MediaKind | null {
  if (MEDIA_LIMITS.imageMimes.includes(mime as never)) return 'image'
  if (MEDIA_LIMITS.videoMimes.includes(mime as never)) return 'video'
  return null
}

export function validateMediaFile(file: File): { ok: true; kind: MediaKind } | { ok: false; error: string } {
  const kind = detectMediaKind(file.type)
  if (!kind) {
    return { ok: false, error: 'סוג קובץ לא נתמך — JPG/PNG או MP4/WebM' }
  }
  const max =
    kind === 'image' ? MEDIA_LIMITS.maxImageBytes : MEDIA_LIMITS.maxVideoBytes
  if (file.size > max) {
    return {
      ok: false,
      error:
        kind === 'image'
          ? 'תמונה גדולה מ-5MB'
          : 'סרטון גדול מ-15MB',
    }
  }
  return { ok: true, kind }
}
