import { describe, expect, it } from 'vitest'
import {
  isDirectHttpsMediaUrl,
  parseMetaMediaId,
  resolveInboundMediaUrl,
} from './media'

describe('inbound media URL helpers', () => {
  it('detects direct https URLs for demo/simulator', () => {
    expect(isDirectHttpsMediaUrl('https://cdn.example.com/photo.jpg')).toBe(true)
    expect(isDirectHttpsMediaUrl('http://insecure.example.com/x')).toBe(false)
    expect(isDirectHttpsMediaUrl('meta-media:abc')).toBe(false)
    expect(isDirectHttpsMediaUrl(null)).toBe(false)
  })

  it('parses meta-media stubs', () => {
    expect(parseMetaMediaId('meta-media:img1')).toBe('img1')
    expect(parseMetaMediaId('meta-media:  xyz  ')).toBe('xyz')
    expect(parseMetaMediaId('https://x')).toBeNull()
    expect(parseMetaMediaId(null)).toBeNull()
  })

  it('keeps https media as-is without Graph calls', async () => {
    const result = await resolveInboundMediaUrl({
      mediaUrl: 'https://example.com/demo.jpg',
      useMemory: true,
    })
    expect(result).toEqual({
      url: 'https://example.com/demo.jpg',
      source: 'https',
    })
  })

  it('returns stub when meta-media has no access token', async () => {
    const prev = process.env.WHATSAPP_ACCESS_TOKEN
    delete process.env.WHATSAPP_ACCESS_TOKEN
    try {
      const result = await resolveInboundMediaUrl({
        mediaUrl: 'meta-media:media123',
        useMemory: true,
        accessToken: null,
      })
      expect(result.url).toBe('meta-media:media123')
      expect(result.source).toBe('stub')
      expect(result.mediaId).toBe('media123')
      expect(result.error).toBe('no_access_token')
    } finally {
      if (prev === undefined) delete process.env.WHATSAPP_ACCESS_TOKEN
      else process.env.WHATSAPP_ACCESS_TOKEN = prev
    }
  })

  it('returns empty for missing media', async () => {
    const result = await resolveInboundMediaUrl({ mediaUrl: null })
    expect(result).toEqual({ url: null, source: 'empty' })
  })
})
