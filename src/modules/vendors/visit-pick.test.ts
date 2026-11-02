import { describe, expect, it } from 'vitest'
import { groupVisitVendors, suggestVisitVendor } from './visit-pick'

const pool = [
  {
    id: 'jlm',
    name: 'דרום אייר · מיזוג',
    specialties: 'hvac',
    coverage: ['JLM', 'S'],
  },
  {
    id: 'ta',
    name: 'קלימה סנטר · מיזוג',
    specialties: 'hvac',
    coverage: ['TA', 'CTR'],
  },
  {
    id: 'plumb',
    name: 'אינסטל פלוס',
    specialties: 'plumbing',
    coverage: ['TA', 'CTR', 'JLM'],
  },
]

describe('visit vendor pick', () => {
  it('suggests the trade that covers the store city', () => {
    const pick = suggestVisitVendor(pool, { category: 'hvac', city: 'ירושלים' })
    expect(pick?.id).toBe('jlm')
  })

  it('puts the store area before the other cities', () => {
    const groups = groupVisitVendors(pool, { city: 'ירושלים' })
    expect(groups[0]?.city).toBe('ירושלים')
    expect(groups[0]?.vendors.map((vendor) => vendor.id).sort()).toEqual(['jlm', 'plumb'])
    expect(groups.some((group) => group.city === 'תל אביב')).toBe(true)
  })
})
