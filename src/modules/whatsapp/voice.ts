import { parseMetaMediaId } from './media'
import { reportLanguage, type ReportLanguage } from './spoken-language'

const GRAPH_VERSION = 'v23.0'

const WHISPER_LANGUAGE: Record<string, ReportLanguage> = {
  he: 'he',
  iw: 'he',
  hebrew: 'he',
  en: 'en',
  english: 'en',
  fr: 'fr',
  french: 'fr',
}

export async function transcribeVoice(
  mediaUrl: string | null,
  accessToken?: string | null,
): Promise<{
  text: string | null
  status: 'transcribed' | 'needs_review'
  reason: string | null
  language: ReportLanguage | null
}> {
  if (!mediaUrl) {
    return { text: null, status: 'needs_review', reason: 'אין קובץ הקלטה', language: null }
  }
  const audio = await loadAudio(mediaUrl, accessToken)
  if (!audio) {
    return {
      text: null,
      status: 'needs_review',
      reason: 'ההקלטה נשמרה וממתינה לתמלול',
      language: null,
    }
  }
  const route = transcriptionRoute()
  if (!route) {
    return {
      text: null,
      status: 'needs_review',
      reason: 'ההקלטה נשמרה וממתינה לתמלול',
      language: null,
    }
  }
  const first = await requestWhisper(audio, route, null)
  if (!first) {
    return {
      text: null,
      status: 'needs_review',
      reason: 'התמלול נכשל וההקלטה ממתינה לבדיקה',
      language: null,
    }
  }
  const detected = whisperLanguage(first.language)
  if (first.text && detected) {
    return { text: first.text, status: 'transcribed', reason: null, language: detected }
  }
  // Whisper often labels Hebrew as Arabic. Retry once in the language the words
  // already show, otherwise Hebrew — the language of this network.
  if (first.language && !detected) {
    const lock = first.text ? reportLanguage(first.text) : 'he'
    const second = await requestWhisper(audio, route, lock)
    const text = second?.text || first.text
    if (text) {
      return { text, status: 'transcribed', reason: null, language: lock }
    }
  }
  if (first.text) {
    return {
      text: first.text,
      status: 'transcribed',
      reason: null,
      language: reportLanguage(first.text),
    }
  }
  return { text: null, status: 'needs_review', reason: 'התמלול יצא ריק', language: null }
}

function whisperLanguage(value: string | null): ReportLanguage | null {
  if (!value) return null
  return WHISPER_LANGUAGE[value.trim().toLowerCase()] ?? null
}

async function requestWhisper(
  audio: { bytes: Uint8Array; mime: string },
  route: { url: string; key: string },
  language: ReportLanguage | null,
): Promise<{ text: string | null; language: string | null } | null> {
  const body = new FormData()
  body.set('model', 'whisper-1')
  body.set('response_format', language ? 'json' : 'verbose_json')
  if (language) body.set('language', language)
  body.set(
    'file',
    new Blob([audio.bytes as BlobPart], { type: audio.mime }),
    'voice.ogg',
  )
  const res = await fetch(route.url, {
    method: 'POST',
    headers: { authorization: `Bearer ${route.key}` },
    body,
  })
  if (!res.ok) return null
  const json = (await res.json()) as { text?: string; language?: string }
  return {
    text: json.text?.trim() || null,
    language: json.language ?? language,
  }
}

function transcriptionRoute(): { url: string; key: string } | null {
  const gateway = process.env.AI_GATEWAY_API_KEY?.trim()
  if (gateway) {
    return { url: 'https://ai-gateway.vercel.sh/v1/audio/transcriptions', key: gateway }
  }
  const openai = process.env.OPENAI_API_KEY?.trim()
  if (openai) {
    return { url: 'https://api.openai.com/v1/audio/transcriptions', key: openai }
  }
  return null
}

async function loadAudio(
  mediaUrl: string,
  accessToken?: string | null,
): Promise<{ bytes: Uint8Array; mime: string } | null> {
  if (mediaUrl.startsWith('data:')) {
    const match = mediaUrl.match(/^data:([^,]*),([\s\S]+)$/)
    if (!match) return null
    return {
      bytes: new Uint8Array(Buffer.from(match[2], 'base64')),
      mime: match[1].split(';')[0] || 'audio/ogg',
    }
  }
  if (/^https:\/\//i.test(mediaUrl)) {
    const res = await fetch(mediaUrl)
    if (!res.ok) return null
    return {
      bytes: new Uint8Array(await res.arrayBuffer()),
      mime: res.headers.get('content-type') || 'audio/ogg',
    }
  }
  const mediaId = parseMetaMediaId(mediaUrl)
  const token = accessToken?.trim() || process.env.WHATSAPP_ACCESS_TOKEN?.trim()
  if (!mediaId || !token) return null
  const metaRes = await fetch(
    `https://graph.facebook.com/${GRAPH_VERSION}/${encodeURIComponent(mediaId)}`,
    { headers: { authorization: `Bearer ${token}` } },
  )
  const meta = (await metaRes.json()) as { url?: string; mime_type?: string }
  if (!metaRes.ok || !meta.url) return null
  const bin = await fetch(meta.url, { headers: { authorization: `Bearer ${token}` } })
  if (!bin.ok) return null
  return { bytes: new Uint8Array(await bin.arrayBuffer()), mime: meta.mime_type || 'audio/ogg' }
}
