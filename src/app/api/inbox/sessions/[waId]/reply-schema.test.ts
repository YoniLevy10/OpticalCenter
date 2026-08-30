import { describe, expect, it } from 'vitest'
import { z } from 'zod'

/** Mirrors the API route preprocess so we can unit-test validation behavior. */
const optionalUuid = z.preprocess((value) => {
  if (
    value == null ||
    value === '' ||
    value === 'null' ||
    value === 'undefined'
  ) {
    return undefined
  }
  return value
}, z.string().uuid().optional())

const ticketUuid = z.preprocess((value) => {
  if (
    value == null ||
    value === '' ||
    value === 'null' ||
    value === 'undefined'
  ) {
    return null
  }
  return value
}, z.string().uuid().nullable())

const replySchema = z.object({
  text: z.string().min(1).max(4096),
  ticketId: ticketUuid,
  countryId: optionalUuid,
})

describe('inbox reply schema', () => {
  it('accepts countryId null / "null" / omitted', () => {
    for (const countryId of [null, 'null', 'undefined', '', undefined]) {
      const parsed = replySchema.safeParse({
        text: 'בדיקה מהמערכת',
        ticketId: null,
        countryId,
      })
      expect(parsed.success).toBe(true)
      if (parsed.success) {
        expect(parsed.data.countryId).toBeUndefined()
        expect(parsed.data.ticketId).toBeNull()
      }
    }
  })

  it('accepts valid country UUID', () => {
    const id = '11111111-1111-4111-8111-111111111111'
    const parsed = replySchema.safeParse({
      text: 'שלום',
      countryId: id,
      ticketId: null,
    })
    expect(parsed.success).toBe(true)
    if (parsed.success) expect(parsed.data.countryId).toBe(id)
  })

  it('rejects non-uuid countryId', () => {
    const parsed = replySchema.safeParse({
      text: 'שלום',
      countryId: 'not-a-uuid',
    })
    expect(parsed.success).toBe(false)
  })

  it('accepts Israeli-style payload without countryId', () => {
    const parsed = replySchema.safeParse({
      text: 'בדיקה מהמערכת',
    })
    expect(parsed.success).toBe(true)
  })
})
