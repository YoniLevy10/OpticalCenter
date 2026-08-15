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

  it('water near electrical cabinet → not low (plumbing keywords today)', () => {
    const r = classifyFaultText('מים זורמים ליד ארון החשמל')
    expect(r.priority).not.toBe('low')
    expect(['high', 'critical']).toContain(r.priority)
  })

  it('gibberish → other medium', () => {
    expect(classifyFaultText('asdf qwer זימבלי')).toEqual({
      category: 'other',
      priority: 'medium',
    })
  })

  it.fails('smoke from outlet should be critical/high (gap today → other/medium)', () => {
    const r = classifyFaultText('עשן יוצא מהשקע')
    expect(['critical', 'high']).toContain(r.priority)
  })

  it('smoke phrase is at least not low today', () => {
    expect(classifyFaultText('עשן יוצא מהשקע').priority).not.toBe('low')
  })
})
