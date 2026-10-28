import { describe, expect, it } from 'vitest'
import { hasBeforeEvidence, resolveProofError } from './proof'

describe('resolve proof', () => {
  it('rejects a resolve with no after photo', () => {
    expect(
      resolveProofError({
        note: 'הוחלף פילטר',
        afterPhotoUrl: '',
        hasIntakePhoto: true,
      }),
    ).toBe('נדרשת תמונת אחרי')
  })

  it('accepts a store photo as the before image', () => {
    expect(
      resolveProofError({
        note: 'הוחלף פילטר',
        afterPhotoUrl: 'data:image/jpeg;base64,aaa',
        hasIntakePhoto: true,
      }),
    ).toBeNull()
  })

  it('requires a before photo when the store sent none', () => {
    expect(
      resolveProofError({
        note: 'הוחלף פילטר',
        afterPhotoUrl: 'data:image/jpeg;base64,aaa',
        hasIntakePhoto: false,
      }),
    ).toBe('נדרשת תמונת לפני')
    expect(
      resolveProofError({
        note: 'הוחלף פילטר',
        afterPhotoUrl: 'data:image/jpeg;base64,aaa',
        beforePhotoUrl: 'data:image/jpeg;base64,bbb',
        hasIntakePhoto: false,
      }),
    ).toBeNull()
  })

  it('does not treat an after photo or a Meta placeholder as before evidence', () => {
    expect(
      hasBeforeEvidence([
        { url: 'https://cdn.example/after.jpg', kind: 'proof_after' },
        { url: 'meta-media:123', kind: 'image' },
      ]),
    ).toBe(false)
    expect(
      hasBeforeEvidence([{ url: 'https://cdn.example/store.jpg', kind: 'image' }]),
    ).toBe(true)
  })
})
