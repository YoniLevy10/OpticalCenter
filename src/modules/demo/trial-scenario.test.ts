import { describe, expect, it } from 'vitest'
import { TRIAL_FAULTS, TRIAL_SPENDS } from '@/modules/demo/trial-scenario'
import { matchProfessionalsForFault } from '@/modules/professionals/match-fault'
import { classifyFaultText } from '@/modules/tickets/classify'
import { SLA_WINDOWS, windowsFromSettings } from '@/modules/tickets/sla'

describe('trial faults', () => {
  it('covers every urgency and leaves one classification to override', () => {
    const priorities = new Set(TRIAL_FAULTS.map((row) => row.priority))
    expect(priorities).toEqual(new Set(['critical', 'high', 'medium', 'low']))
    const hvac = TRIAL_FAULTS.find((row) => row.id === 'trial-6006-hvac')
    expect(hvac).toBeTruthy()
    expect(classifyFaultText(hvac!.description).priority).not.toBe(hvac!.priority)
  })

  it('files spend requests from several store managers', () => {
    const codes = new Set(TRIAL_SPENDS.map((row) => row.storeCode))
    expect(codes.size).toBeGreaterThan(2)
    expect(TRIAL_SPENDS.some((row) => row.status === 'pending')).toBe(true)
  })
})

describe('matchProfessionalsForFault', () => {
  const book = [
    { id: '1', full_name: 'אורי', phone: null, trade: 'תיקון מזגנים', notes: null, use_count: 1 },
    { id: '2', full_name: 'דנה', phone: null, trade: 'חשמלאים', notes: null, use_count: 3 },
    { id: '3', full_name: 'נועה', phone: null, trade: 'ניקיון מסחרי', notes: null, use_count: 1 },
  ]

  it('keeps only the trade that matches the fault', () => {
    const matches = matchProfessionalsForFault(book, 'hvac')
    expect(matches.map((row) => row.id)).toEqual(['1'])
  })
})

describe('windowsFromSettings', () => {
  it('uses the configured respond hours and keeps resolve after respond', () => {
    const windows = windowsFromSettings({
      sla_respond_hours_critical: 3,
      sla_respond_hours_high: SLA_WINDOWS.high.respondHours,
      sla_respond_hours_medium: SLA_WINDOWS.medium.respondHours,
      sla_respond_hours_low: 80,
    })
    expect(windows.critical.respondHours).toBe(3)
    expect(windows.critical.resolveHours).toBeGreaterThan(3)
    expect(windows.low.resolveHours).toBeGreaterThan(80)
  })
})
