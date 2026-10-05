import { parseMetaMediaId } from './media'

const GRAPH_VERSION = 'v23.0'

export async function transcribeVoice(
  mediaUrl: string | null,
  accessToken?: string | null,
): Promise<{
  text: string | null
  status: 'transcribed' | 'needs_review'
  reason: string | null
}> {
  if (!mediaUrl) {
    return { text: null, status: 'needs_review', reason: 'אין קובץ הקלטה' }
  }
  const audio = await loadAudio(mediaUrl, accessToken)
  if (!audio) {
    return {
      text: null,
      status: 'needs_review',
      reason: 'ההקלטה נשמרה וממתינה לתמלול',
    }
  }
  const route = transcriptionRoute()
  if (!route) {
    return {
      text: null,
      status: 'needs_review',
      reason: 'ההקלטה נשמרה וממתינה לתמלול',
    }
  }
  const body = new FormData()
  body.set('model', 'whisper-1')
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
  if (!res.ok) {
    return {
      text: null,
      status: 'needs_review',
      reason: 'התמלול נכשל וההקלטה ממתינה לבדיקה',
    }
  }
  const json = (await res.json()) as { text?: string }
  const text = json.text?.trim() || null
  if (!text) {
    return { text: null, status: 'needs_review', reason: 'התמלול יצא ריק' }
  }
  return { text, status: 'transcribed', reason: null }
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
