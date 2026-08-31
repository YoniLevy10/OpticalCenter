import { describe, expect, it } from 'vitest'
import {
  greetingHe,
  humanTicketStatus,
  ticketNextAction,
} from './human-copy'

describe('humanTicketStatus', () => {
  it('maps operational jargon to plain Hebrew', () => {
    expect(humanTicketStatus('waiting_parts')).toBe('מחכה לחלק')
    expect(humanTicketStatus('triaged')).toBe('מחכה לטיפול')
    expect(humanTicketStatus('resolved')).toBe('הסתיים')
    expect(humanTicketStatus('closed')).toBe('הסתיים')
  })
})

describe('ticketNextAction', () => {
  it('asks to pick a technician when unassigned', () => {
    const hint = ticketNextAction({ status: 'new', assigned_to: null })
    expect(hint.cta).toBe('בחר טכנאי')
    expect(hint.body).toContain('עדיין לא נבחר טכנאי')
  })

  it('guides waiting_parts in plain language', () => {
    const hint = ticketNextAction({
      status: 'waiting_parts',
      assigned_to: 'tech-1',
    })
    expect(hint.body).toContain('חלק')
    expect(hint.kind).toBe('parts')
  })

  it('marks resolved as done', () => {
    expect(ticketNextAction({ status: 'resolved', assigned_to: 'x' }).kind).toBe(
      'done',
    )
  })
})

describe('greetingHe', () => {
  it('returns a Hebrew greeting', () => {
    expect(greetingHe(new Date('2026-08-31T08:00:00'))).toBe('בוקר טוב')
    expect(greetingHe(new Date('2026-08-31T20:00:00'))).toBe('ערב טוב')
  })
})
