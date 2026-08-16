import { describe, expect, it } from 'vitest'
import { classifyFaultText } from '@/modules/tickets/classify'

describe('Critical classification examples', () => {
  it('HVAC → high', () => {
    expect(classifyFaultText('המזגן לא עובד')).toEqual({
      category: 'hvac',
      priority: 'high',
    })
  })

  it('burnt bulb → electrical high', () => {
    expect(classifyFaultText('נורה שרופה במחסן')).toEqual({
      category: 'electrical',
      priority: 'high',
    })
  })

  it('loose door handle → security critical', () => {
    expect(classifyFaultText('ידית הדלת רופפת')).toEqual({
      category: 'security',
      priority: 'critical',
    })
  })

  it('water near electrical cabinet → critical hazard', () => {
    const r = classifyFaultText('מים זורמים ליד ארון החשמל')
    expect(r.priority).toBe('critical')
    expect(r.category).toBe('electrical_hazard')
  })

  it('smoke from outlet → critical', () => {
    expect(classifyFaultText('עשן יוצא מהשקע')).toEqual({
      category: 'electrical_hazard',
      priority: 'critical',
    })
  })

  it('English fire/sparks escalate', () => {
    expect(classifyFaultText('smoke and sparks near panel').priority).toBe(
      'critical',
    )
    expect(classifyFaultText('burning smell from socket').priority).toBe(
      'critical',
    )
  })

  it('gibberish → other medium', () => {
    expect(classifyFaultText('asdf qwer זימבלי')).toEqual({
      category: 'other',
      priority: 'medium',
    })
  })
})
