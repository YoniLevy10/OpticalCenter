import { describe, expect, it } from 'vitest'
import { z } from 'zod'

/** Mirrors production reply schema: Israel-only, countryId ignored. */
const replySchema = z.object({
  text: z.string().min(1).max(4096),
  ticketId: z.preprocess((value) => {
    if (
      value == null ||
      value === '' ||
      value === 'null' ||
      value === 'undefined'
    ) {
      return null
    }
    return value
  }, z.string().uuid().nullable().optional()),
  countryId: z.any().optional(),
})

describe('inbox reply schema (Israel default)', () => {
  it('accepts payload without countryId', () => {
    const parsed = replySchema.safeParse({ text: 'בדיקה מהמערכת' })
    expect(parsed.success).toBe(true)
  })

  it('accepts garbage countryId and ignores it', () => {
    for (const countryId of [null, 'null', 'undefined', '', 'not-a-uuid', 123]) {
      const parsed = replySchema.safeParse({
        text: 'בדיקה מהמערכת',
        ticketId: null,
        countryId,
      })
      expect(parsed.success).toBe(true)
    }
  })

  it('still validates ticketId when present', () => {
    const bad = replySchema.safeParse({
      text: 'שלום',
      ticketId: 'not-uuid',
    })
    expect(bad.success).toBe(false)

    const good = replySchema.safeParse({
      text: 'שלום',
      ticketId: '11111111-1111-4111-8111-111111111111',
    })
    expect(good.success).toBe(true)
  })
})
