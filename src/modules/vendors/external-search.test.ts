import { describe, expect, it } from 'vitest'
import {
  buildMidragSearchUrl,
  buildMidragCityPickerUrl,
  buildMidragGoogleBackupUrl,
  externalSearchCaption,
  midragAreaIdForCity,
} from './external-search'

describe('buildMidragSearchUrl', () => {
  it('maps HVAC + Tel Aviv to Results with service and area', () => {
    const url = buildMidragSearchUrl({ category: 'hvac', city: 'תל אביב' })
    expect(url).toContain('midrag.co.il/Search/Results')
    expect(url).toContain('serviceId=286')
    expect(url).toContain('areaId=1')
  })

  it('uses nationwide areaId=0 when city unknown', () => {
    const url = buildMidragSearchUrl({ category: 'electrical' })
    expect(url).toContain('serviceId=152')
    expect(url).toContain('areaId=0')
  })

  it('falls back to InSector for unknown category', () => {
    expect(buildMidragSearchUrl({ category: 'other' })).toContain('InSector')
  })
})

describe('buildMidragCityPickerUrl', () => {
  it('offers InCity when city is set but unmapped', () => {
    const url = buildMidragCityPickerUrl({
      category: 'hvac',
      city: 'קרית גת',
    })
    expect(url).toContain('InCity')
    expect(url).toContain('serviceId=286')
  })

  it('returns null when area is already mapped', () => {
    expect(
      buildMidragCityPickerUrl({ category: 'hvac', city: 'תל אביב' }),
    ).toBeNull()
  })
})

describe('helpers', () => {
  it('resolves common cities', () => {
    expect(midragAreaIdForCity('תל אביב')).toBe(1)
    expect(midragAreaIdForCity('חיפה')).toBe(0)
    expect(midragAreaIdForCity('')).toBe(0)
  })

  it('builds google backup and caption', () => {
    expect(buildMidragGoogleBackupUrl({ category: 'hvac', city: 'נתניה' })).toContain(
      'google.com/search',
    )
    expect(externalSearchCaption({ category: 'plumbing', city: 'אשדוד' })).toBe(
      'מידרג · אינסטלציה · אשדוד',
    )
  })
})
