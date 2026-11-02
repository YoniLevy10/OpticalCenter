import { beforeEach, describe, expect, it } from 'vitest'
import { memAddMessage, memCreate, memReset } from '@/lib/data/memory-store'
import { israelStoresAsRows } from '@/modules/stores/israel-stores'
import { photosForTickets } from './attachments'

describe('photosForTickets', () => {
  beforeEach(() => {
    process.env.MAINTAINOS_FORCE_MEMORY = '1'
    memReset()
  })

  it('returns a photo only when the fault has one', async () => {
    const store = israelStoresAsRows().find((row) => row.code === '6005')!
    const withPhoto = memCreate({
      store,
      description: 'מצלמה כבויה',
      priority: 'high',
      category: 'security',
    })
    const bare = memCreate({
      store,
      description: 'נזילה',
      priority: 'high',
      category: 'plumbing',
    })
    memAddMessage(withPhoto.id, {
      channel: 'whatsapp',
      direction: 'inbound',
      body: null,
      media_url: 'https://cdn.example/camera.jpg',
    })

    const photos = await photosForTickets([withPhoto.id, bare.id])

    expect(photos[withPhoto.id]?.map((photo) => photo.url)).toEqual([
      'https://cdn.example/camera.jpg',
    ])
    expect(photos[bare.id]).toBeUndefined()
  })
})