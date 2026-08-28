import { describe, expect, it } from 'vitest'
import {
  applyIntakeRules,
  descriptionNeedsClarification,
  parseIntakeAgentOutput,
  safeParseIntakeAgentOutput,
} from '@/modules/whatsapp/agent'

describe('intake agent schema', () => {
  it('parses valid structured output', () => {
    const out = parseIntakeAgentOutput({
      category: 'hvac',
      summary: 'המזגן הראשי אינו מקרר וקיימת נזילת מים',
      asset: 'Main AC',
      priority_suggestion: 'high',
      needs_clarification: false,
      clarification_question: null,
      possible_duplicate_hint: null,
    })
    expect(out.category).toBe('hvac')
    expect(out.summary).toContain('מזגן')
  })

  it('rejects invalid category', () => {
    const r = safeParseIntakeAgentOutput({
      category: 'spaceship',
      summary: 'x',
      asset: null,
      priority_suggestion: 'high',
      needs_clarification: false,
      clarification_question: null,
      possible_duplicate_hint: null,
    })
    expect(r.success).toBe(false)
  })
})

describe('intake rules engine', () => {
  it('HVAC + leak → hvac high', () => {
    const r = applyIntakeRules({
      text: 'המזגן הראשי לא עובד ויש ממנו נזילה',
    })
    expect(r.category).toBe('hvac')
    expect(r.priority).toBe('high')
    expect(r.applied.some((a) => a.id === 'hvac_leak')).toBe(true)
  })

  it('water + electric → critical', () => {
    const r = applyIntakeRules({
      text: 'מים זורמים ליד לוח החשמל',
    })
    expect(r.priority).toBe('critical')
    expect(r.category).toBe('electrical_hazard')
  })

  it('decorative lighting → low', () => {
    const r = applyIntakeRules({
      text: 'תאורת דקור בויטרינה לא נדלקת',
    })
    expect(r.priority).toBe('low')
  })

  it('AI suggestion cannot undercut safety rule', () => {
    const r = applyIntakeRules({
      text: 'ריח שרוף מהשקע',
      ai: { category: 'other', priority_suggestion: 'low' },
    })
    expect(r.priority).toBe('critical')
  })

  it('thin description needs clarification', () => {
    expect(descriptionNeedsClarification('תקלה', false).needs).toBe(true)
    expect(
      descriptionNeedsClarification('המזגן הראשי לא מקרר', false).needs,
    ).toBe(false)
  })
})
