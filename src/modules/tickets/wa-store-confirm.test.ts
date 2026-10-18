import { describe, expect, it } from 'vitest'
import {
  formatAwaitingConfirmChoice,
  isStoreConfirmReply,
  isStoreRejectReply,
  parseStoreConfirmButtonId,
  parseStoreRejectButtonId,
  reporterPhoneMatches,
  storeConfirmButtonId,
  storeRejectButtonId,
} from './wa-store-confirm'

describe('wa-store-confirm', () => {
  it('builds and parses confirm button ids', () => {
    const id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
    expect(storeConfirmButtonId(id)).toBe(`store_confirm:${id}`)
    expect(parseStoreConfirmButtonId(`store_confirm:${id}`)).toBe(id)
    expect(parseStoreConfirmButtonId('desk_approve')).toBeNull()
    expect(parseStoreConfirmButtonId(null)).toBeNull()
  })

  it('builds and parses reject button ids', () => {
    const id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
    expect(storeRejectButtonId(id)).toBe(`store_reject:${id}`)
    expect(parseStoreRejectButtonId(`store_reject:${id}`)).toBe(id)
    expect(parseStoreRejectButtonId(`store_confirm:${id}`)).toBeNull()
  })

  it('detects Hebrew confirm replies', () => {
    expect(isStoreConfirmReply('מאשר')).toBe(true)
    expect(isStoreConfirmReply('מאשר תיקון')).toBe(true)
    expect(isStoreConfirmReply('אושר')).toBe(true)
    expect(isStoreConfirmReply('הבעיה נפתרה')).toBe(true)
    expect(isStoreConfirmReply('תודה תוקן')).toBe(true)
    expect(isStoreConfirmReply('הכל תקין')).toBe(true)
  })

  it('detects לא נפתר replies', () => {
    expect(isStoreRejectReply('לא נפתר')).toBe(true)
    expect(isStoreRejectReply('לא תוקן')).toBe(true)
    expect(isStoreRejectReply('עדיין לא נפתר')).toBe(true)
    expect(isStoreRejectReply('הבעיה נמשכת')).toBe(true)
    expect(isStoreRejectReply('מאשר')).toBe(false)
  })

  it('rejects unrelated or long messages', () => {
    expect(isStoreConfirmReply('תודה רבה')).toBe(false)
    expect(isStoreConfirmReply('המזגן לא עובד')).toBe(false)
    expect(isStoreConfirmReply('מאשר אבל יש עוד נזילה מהתקרה בחנות')).toBe(
      false,
    )
    expect(isStoreConfirmReply(null)).toBe(false)
  })

  it('matches reporter phones across local / E.164 forms', () => {
    expect(reporterPhoneMatches('972501112233', '050-111-2233')).toBe(true)
    expect(reporterPhoneMatches('972501112233', '972509998877')).toBe(false)
  })

  it('formats ambiguous choice without picking latest', () => {
    const text = formatAwaitingConfirmChoice([
      { display: 'OC-1' },
      { display: 'OC-2' },
    ])
    expect(text).toMatch(/יותר מתקלה אחת/)
    expect(text).toContain('OC-1')
    expect(text).toContain('OC-2')
    expect(text).toMatch(/הודעה של התקלה הספציפית/)
  })
})
