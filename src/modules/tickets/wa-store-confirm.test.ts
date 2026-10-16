import { describe, expect, it } from 'vitest'
import {
  isStoreConfirmReply,
  parseStoreConfirmButtonId,
  storeConfirmButtonId,
} from './wa-store-confirm'

describe('wa-store-confirm', () => {
  it('builds and parses button ids', () => {
    const id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
    expect(storeConfirmButtonId(id)).toBe(`store_confirm:${id}`)
    expect(parseStoreConfirmButtonId(`store_confirm:${id}`)).toBe(id)
    expect(parseStoreConfirmButtonId('desk_approve')).toBeNull()
    expect(parseStoreConfirmButtonId(null)).toBeNull()
  })

  it('detects Hebrew confirm replies', () => {
    expect(isStoreConfirmReply('מאשר')).toBe(true)
    expect(isStoreConfirmReply('מאשר תיקון')).toBe(true)
    expect(isStoreConfirmReply('אושר')).toBe(true)
    expect(isStoreConfirmReply('הבעיה נפתרה')).toBe(true)
    expect(isStoreConfirmReply('תודה תוקן')).toBe(true)
    expect(isStoreConfirmReply('הכל תקין')).toBe(true)
  })

  it('rejects unrelated or long messages', () => {
    expect(isStoreConfirmReply('תודה רבה')).toBe(false)
    expect(isStoreConfirmReply('המזגן לא עובד')).toBe(false)
    expect(isStoreConfirmReply('מאשר אבל יש עוד נזילה מהתקרה בחנות')).toBe(
      false,
    )
    expect(isStoreConfirmReply(null)).toBe(false)
  })
})
