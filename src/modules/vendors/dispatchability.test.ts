import { describe, expect, it } from 'vitest'
import {
  isDispatchableVendor,
  vendorDispatchChannel,
} from './dispatchability'
import { matchPreferredVendors } from './match'

describe('vendor dispatch channel (C07)', () => {
  it('marks webhook vendors as dispatchable', () => {
    expect(
      vendorDispatchChannel({
        webhook_url: 'https://partners.example.invalid/hook',
      }),
    ).toBe('dispatchable')
    expect(
      isDispatchableVendor({
        webhook_url: 'https://partners.example.invalid/hook',
      }),
    ).toBe(true)
  })

  it('marks missing/blank webhook as dial-only', () => {
    expect(vendorDispatchChannel({ webhook_url: null })).toBe('dial_only')
    expect(vendorDispatchChannel({ webhook_url: '  ' })).toBe('dial_only')
    expect(isDispatchableVendor({})).toBe(false)
  })

  it('propagates dispatchable on preferred matches', () => {
    const hits = matchPreferredVendors(
      [
        {
          id: 'v-hook',
          name: 'עם webhook',
          specialties: 'hvac',
          active: true,
          preferred: true,
          coverage_regions: ['TA'],
          webhook_url: 'https://partners.example.invalid/hook',
        },
        {
          id: 'v-dial',
          name: 'חיוג בלבד',
          specialties: 'hvac',
          active: true,
          preferred: true,
          coverage_regions: ['TA'],
          webhook_url: null,
        },
      ],
      { category: 'hvac', regionIdOrCode: 'TA' },
    )
    expect(hits.find((h) => h.id === 'v-hook')?.dispatchable).toBe(true)
    expect(hits.find((h) => h.id === 'v-dial')?.dispatchable).toBe(false)
  })
})
