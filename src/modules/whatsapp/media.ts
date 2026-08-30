import type { SupabaseClient } from '@supabase/supabase-js'
import { logEvent } from '@/lib/logging'

const META_MEDIA_PREFIX = 'meta-media:'
const GRAPH_VERSION = 'v21.0'
const BUCKET = 'ticket-media'

export type ResolveInboundMediaResult = {
  url: string | null
  source: 'https' | 'storage' | 'data_url' | 'stub' | 'unchanged' | 'failed' | 'empty'
  error?: string
  mediaId?: string | null
}

export type ResolveInboundMediaOpts = {
  mediaUrl: string | null | undefined
  mediaKind?: 'image' | 'video' | 'document' | null
  /** Country / env WhatsApp Graph access token */
  accessToken?: string | null
  ticketId?: string | null
  supabase?: SupabaseClient | null
  /** When true, skip storage upload and keep https / data URL / stub */
  useMemory?: boolean
}

/** True when media is already a usable absolute URL (simulator / demo). */
export function isDirectHttpsMediaUrl(url: string | null | undefined): boolean {
  if (!url) return false
  return /^https:\/\//i.test(url.trim())
}

/** Extract Meta media id from `meta-media:{id}` stub. */
export function parseMetaMediaId(url: string | null | undefined): string | null {
  if (!url) return null
  const trimmed = url.trim()
  if (!trimmed.startsWith(META_MEDIA_PREFIX)) return null
  const id = trimmed.slice(META_MEDIA_PREFIX.length).trim()
  return id || null
}

async function fetchGraphMediaBinary(
  mediaId: string,
  accessToken: string,
): Promise<{ bytes: ArrayBuffer; mimeType: string; downloadUrl: string }> {
  const metaRes = await fetch(
    `https://graph.facebook.com/${GRAPH_VERSION}/${encodeURIComponent(mediaId)}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  )
  const metaJson = (await metaRes.json()) as {
    url?: string
    mime_type?: string
    error?: { message?: string }
  }
  if (!metaRes.ok || !metaJson.url) {
    throw new Error(metaJson.error?.message || `Graph media meta ${metaRes.status}`)
  }

  const binRes = await fetch(metaJson.url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!binRes.ok) {
    throw new Error(`Graph media download ${binRes.status}`)
  }
  const bytes = await binRes.arrayBuffer()
  const mimeType =
    metaJson.mime_type ||
    binRes.headers.get('content-type') ||
    'application/octet-stream'
  return { bytes, mimeType, downloadUrl: metaJson.url }
}

function extensionForMime(
  mime: string,
  kind: 'image' | 'video' | 'document' | null,
): string {
  if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg'
  if (mime.includes('png')) return 'png'
  if (mime.includes('webp')) return 'webp'
  if (mime.includes('gif')) return 'gif'
  if (mime.includes('pdf')) return 'pdf'
  if (mime.includes('webm')) return 'webm'
  if (mime.includes('mp4') || mime.includes('video')) return 'mp4'
  return kind === 'document' ? 'bin' : 'jpg'
}

function toDataUrl(bytes: ArrayBuffer, mimeType: string): string {
  const buf = Buffer.from(bytes)
  return `data:${mimeType};base64,${buf.toString('base64')}`
}

/**
 * Resolve inbound WhatsApp media to a durable URL.
 * - Already-https (demo/simulator): keep as-is
 * - `meta-media:{id}`: download via Graph, upload to `ticket-media` when possible
 * - Memory / no storage: data URL when download succeeds
 * - Never return a bare `meta-media:` stub for UI display (url=null + source stub/failed)
 */
export async function resolveInboundMediaUrl(
  opts: ResolveInboundMediaOpts,
): Promise<ResolveInboundMediaResult> {
  const raw = opts.mediaUrl?.trim() || null
  if (!raw) return { url: null, source: 'empty' }

  if (isDirectHttpsMediaUrl(raw)) {
    return { url: raw, source: 'https' }
  }

  const mediaId = parseMetaMediaId(raw)
  if (!mediaId) {
    if (raw.startsWith('data:')) return { url: raw, source: 'data_url' }
    return { url: raw, source: 'unchanged' }
  }

  const token =
    opts.accessToken?.trim() ||
    process.env.WHATSAPP_ACCESS_TOKEN?.trim() ||
    null

  if (!token) {
    logEvent('whatsapp:media', 'warn', 'no_access_token', { mediaId })
    return { url: null, source: 'stub', mediaId, error: 'no_access_token' }
  }

  try {
    const { bytes, mimeType } = await fetchGraphMediaBinary(mediaId, token)
    const ext = extensionForMime(mimeType, opts.mediaKind ?? null)
    const path = `${opts.ticketId ?? 'inbound'}/${mediaId}.${ext}`

    if (opts.supabase && !opts.useMemory) {
      const { error: uploadError } = await opts.supabase.storage
        .from(BUCKET)
        .upload(path, bytes, { contentType: mimeType, upsert: true })

      if (!uploadError) {
        const { data } = opts.supabase.storage.from(BUCKET).getPublicUrl(path)
        if (data?.publicUrl) {
          return {
            url: data.publicUrl,
            source: 'storage',
            mediaId,
          }
        }
      } else {
        logEvent('whatsapp:media', 'warn', 'storage_upload_failed', {
          mediaId,
          error: uploadError.message,
        })
      }
    }

    // Memory / storage unavailable: keep a usable demo URL (data URL).
    const dataUrl = toDataUrl(bytes, mimeType)
    return { url: dataUrl, source: 'data_url', mediaId }
  } catch (e) {
    const error = e instanceof Error ? e.message : 'media_resolve_failed'
    logEvent('whatsapp:media', 'error', 'download_failed', { mediaId, error })
    return { url: null, source: 'failed', mediaId, error }
  }
}

/** True when URL can be shown in <img>/<video> (not a Meta stub). */
export function isDisplayableMediaUrl(url: string | null | undefined): boolean {
  if (!url) return false
  if (url.startsWith(META_MEDIA_PREFIX)) return false
  return (
    isDirectHttpsMediaUrl(url) ||
    url.startsWith('data:') ||
    url.startsWith('blob:')
  )
}
