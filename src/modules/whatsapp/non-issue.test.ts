import { describe, expect, it } from 'vitest'
import { isNonIssueAck } from './non-issue'

describe('isNonIssueAck', () => {
  it('detects common Hebrew / English gratitude', () => {
    expect(isNonIssueAck('תודה רבה')).toBe(true)
    expect(isNonIssueAck('תודה!')).toBe(true)
    expect(isNonIssueAck('  תודה רבה  ')).toBe(true)
    expect(isNonIssueAck('thanks')).toBe(true)
    expect(isNonIssueAck('בסדר')).toBe(true)
    expect(isNonIssueAck('אוקיי')).toBe(true)
    expect(isNonIssueAck('מעולה')).toBe(true)
  })

  it('does not treat real fault reports as acks', () => {
    expect(isNonIssueAck('סתימה בשירותים נשים')).toBe(false)
    expect(isNonIssueAck('המזגן לא עובד')).toBe(false)
    expect(isNonIssueAck('תודה אבל יש עוד נזילה מהתקרה')).toBe(false)
  })

  it('treats short gratitude-with-context as ack', () => {
    expect(isNonIssueAck('תודה על הטיפול')).toBe(true)
    expect(isNonIssueAck('תודה, תוקן')).toBe(true)
  })
})
