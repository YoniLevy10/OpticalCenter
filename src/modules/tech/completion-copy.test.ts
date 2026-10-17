import { describe, expect, it } from 'vitest'
import {
  TECH_COMPLETION,
  completionBusyLabel,
  treatmentSummaryValid,
} from './completion-copy'

describe('tech completion copy (C04)', () => {
  it('never markets resolve as closed', () => {
    expect(TECH_COMPLETION.successToast).toBe('נשלח לאישור החנות')
    expect(TECH_COMPLETION.successBanner).toBe('נשלח לאישור החנות')
    expect(TECH_COMPLETION.successToast).not.toMatch(/נסגר/)
    expect(TECH_COMPLETION.successBanner).not.toMatch(/נסגר/)
    expect(TECH_COMPLETION.submitLabel).not.toMatch(/נסגר/)
  })

  it('requires a real treatment summary', () => {
    expect(treatmentSummaryValid('')).toBe(false)
    expect(treatmentSummaryValid('קצר')).toBe(false)
    expect(treatmentSummaryValid('הוחלף פילטר ונבדק')).toBe(true)
  })

  it('exposes upload then save busy labels', () => {
    expect(completionBusyLabel('uploading')).toBe('מעלה הוכחה…')
    expect(completionBusyLabel('saving')).toBe('שומר סיום…')
    expect(completionBusyLabel('idle')).toBeNull()
  })
})
