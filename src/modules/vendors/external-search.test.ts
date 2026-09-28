import { describe, expect, it } from 'vitest'
import { ISRAEL_STORES } from '@/modules/stores/israel-stores'
import {
  buildMidragSearchUrl,
  buildMidragCityPickerUrl,
  buildMidragGoogleBackupUrl,
  externalSearchCaption,
  midragCityMatchForCity,
} from './external-search'

describe('buildMidragSearchUrl', () => {
  it('maps HVAC + Tel Aviv to Results with serviceId and cityId', () => {
    const url = buildMidragSearchUrl({ category: 'hvac', city: 'תל אביב' })
    expect(url).toContain('midrag.co.il/Search/Results')
    expect(url).toContain('serviceId=286')
    expect(url).toContain('cityId=1243')
    expect(url).not.toContain('areaId=')
  })

  it('maps Haifa / Jerusalem / Netanya to distinct cityIds (not Tel Aviv)', () => {
    expect(buildMidragSearchUrl({ category: 'hvac', city: 'חיפה' })).toContain(
      'cityId=421',
    )
    expect(
      buildMidragSearchUrl({ category: 'electrical', city: 'ירושלים' }),
    ).toContain('cityId=515')
    expect(
      buildMidragSearchUrl({ category: 'plumbing', city: 'נתניה' }),
    ).toContain('cityId=900')
  })

  it('omits cityId when city unknown (no Tel Aviv default)', () => {
    const url = buildMidragSearchUrl({ category: 'electrical' })
    expect(url).toContain('serviceId=152')
    expect(url).not.toContain('cityId=')
    expect(url).not.toContain('areaId=')
  })

  it('falls back to InSector for unknown category', () => {
    expect(buildMidragSearchUrl({ category: 'other' })).toContain('InSector')
  })

  it('resolves OC city aliases (פרדס חנה, יקנעם)', () => {
    expect(
      buildMidragSearchUrl({ category: 'hvac', city: 'פרדס חנה' }),
    ).toContain('cityId=1027')
    expect(buildMidragSearchUrl({ category: 'hvac', city: 'יקנעם' })).toContain(
      'cityId=510',
    )
  })
})

describe('buildMidragCityPickerUrl', () => {
  it('offers InCity when city is set but unmapped', () => {
    const url = buildMidragCityPickerUrl({
      category: 'hvac',
      city: 'יישוב לא קיים',
    })
    expect(url).toContain('InCity')
    expect(url).toContain('serviceId=286')
  })

  it('returns null when city is already mapped', () => {
    expect(
      buildMidragCityPickerUrl({ category: 'hvac', city: 'חיפה' }),
    ).toBeNull()
  })
})

describe('midragCityMatchForCity + OC store coverage', () => {
  it('resolves common cities', () => {
    expect(midragCityMatchForCity('תל אביב')?.cityId).toBe(1243)
    expect(midragCityMatchForCity('חיפה')?.cityId).toBe(421)
    expect(midragCityMatchForCity('')).toBeNull()
  })

  it('maps every ISRAEL_STORES city to a Midrag cityId', () => {
    const unique = [...new Set(ISRAEL_STORES.map((s) => s.city))]
    const missing = unique.filter((c) => !midragCityMatchForCity(c))
    expect(missing).toEqual([])
  })

  it('builds google backup and caption with Midrag label', () => {
    expect(buildMidragGoogleBackupUrl({ category: 'hvac', city: 'נתניה' })).toContain(
      'google.com/search',
    )
    expect(externalSearchCaption({ category: 'plumbing', city: 'אשדוד' })).toBe(
      'מידרג · אינסטלציה · אשדוד',
    )
    expect(externalSearchCaption({ category: 'hvac', city: 'פרדס חנה' })).toContain(
      'פרדס חנה-כרכור',
    )
  })
})
