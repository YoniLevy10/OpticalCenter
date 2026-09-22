import { describe, expect, it } from 'vitest'
import { matchPreferredVendors, coverageSummary } from './match'
import { PREFERRED_VENDOR_SEEDS, CORE_TRADES_FOR_COVERAGE } from './preferred-seed'
import { IL_REGION_CODES } from '@/modules/stores/regions'

const vendors = PREFERRED_VENDOR_SEEDS.map((s) => ({
  id: s.id,
  name: s.name,
  specialties: s.specialties,
  active: true,
  preferred: s.preferred,
  coverage_regions: [...s.coverage_regions],
  contact_phone: s.contact_phone,
  notes: s.notes,
}))

describe('matchPreferredVendors', () => {
  it('returns preferred HVAC vendors covering Tel Aviv', () => {
    const hits = matchPreferredVendors(vendors, {
      category: 'hvac',
      regionIdOrCode: 'TA',
    })
    expect(hits.length).toBeGreaterThan(0)
    expect(hits[0]?.preferred).toBe(true)
    expect(hits[0]?.coverage_regions).toContain('TA')
    expect(hits[0]?.specialties).toBe('hvac')
  })

  it('matches by region UUID from seed hierarchy', () => {
    const hits = matchPreferredVendors(vendors, {
      category: 'electrical',
      regionIdOrCode: '33333333-3333-3333-3333-333333333305', // N
    })
    expect(hits.some((h) => h.id === 'vendor-pref-elec-north')).toBe(true)
  })

  it('excludes vendors outside region coverage', () => {
    const hits = matchPreferredVendors(vendors, {
      category: 'hvac',
      regionIdOrCode: 'S',
    })
    expect(hits.every((h) => (h.coverage_regions ?? []).includes('S'))).toBe(
      true,
    )
  })
})

describe('national preferred coverage', () => {
  it('covers every district × core trade', () => {
    const rows = coverageSummary(
      vendors,
      [...IL_REGION_CODES],
      [...CORE_TRADES_FOR_COVERAGE],
    )
    const gaps = rows.filter((r) => !r.covered)
    expect(gaps).toEqual([])
  })
})
