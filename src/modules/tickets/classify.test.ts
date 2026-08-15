import { describe, expect, it } from 'vitest'
import { classifyFaultText } from './classify'

describe('classifyFaultText', () => {
  it('marks HVAC Hebrew as high', () => {
    expect(classifyFaultText('המזגן הראשי לא עובד')).toEqual({
      category: 'hvac',
      priority: 'high',
    })
  })

  it('marks security as critical', () => {
    expect(classifyFaultText('הדלת לא ננעלת')).toEqual({
      category: 'security',
      priority: 'critical',
    })
  })

  it('defaults unknown to other/medium', () => {
    expect(classifyFaultText('משהו לא בסדר')).toEqual({
      category: 'other',
      priority: 'medium',
    })
  })
})
