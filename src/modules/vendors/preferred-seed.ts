import type { IlRegionCode } from '@/modules/stores/regions'
import { IL_REGION_CODES } from '@/modules/stores/regions'

export type PreferredVendorSeed = {
  id: string
  name: string
  contact_phone: string
  specialties: string
  coverage_regions: IlRegionCode[]
  preferred: true
  notes: string
}

/**
 * National preferred pool for Optical Center demo / pilot.
 * Coverage spans all six IL districts × core maintenance trades.
 * Phone numbers are placeholders (demo) — replace with vetted contacts before go-live.
 */
export const PREFERRED_VENDOR_SEEDS: readonly PreferredVendorSeed[] = [
  {
    id: 'vendor-pref-hvac-center',
    name: 'קלימה סנטר · מיזוג',
    contact_phone: '972501100101',
    specialties: 'hvac',
    coverage_regions: ['TA', 'CTR'],
    preferred: true,
    notes: 'מועדף · ת״א והמרכז · זמינות 08:00–20:00',
  },
  {
    id: 'vendor-pref-hvac-north',
    name: 'צפון קול · מיזוג',
    contact_phone: '972501100102',
    specialties: 'hvac',
    coverage_regions: ['HFA', 'N'],
    preferred: true,
    notes: 'מועדף · חיפה והצפון',
  },
  {
    id: 'vendor-pref-hvac-south',
    name: 'דרום אייר · מיזוג',
    contact_phone: '972501100103',
    specialties: 'hvac',
    coverage_regions: ['JLM', 'S'],
    preferred: true,
    notes: 'מועדף · ירושלים והדרום',
  },
  {
    id: 'vendor-pref-elec-center',
    name: 'חשמלנט · חשמל',
    contact_phone: '972501100201',
    specialties: 'electrical',
    coverage_regions: ['TA', 'CTR', 'JLM'],
    preferred: true,
    notes: 'מועדף · מרכז הארץ',
  },
  {
    id: 'vendor-pref-elec-north',
    name: 'גל חשמל · צפון',
    contact_phone: '972501100202',
    specialties: 'electrical',
    coverage_regions: ['HFA', 'N'],
    preferred: true,
    notes: 'מועדף · חיפה והצפון',
  },
  {
    id: 'vendor-pref-elec-south',
    name: 'נגב חשמל',
    contact_phone: '972501100203',
    specialties: 'electrical',
    coverage_regions: ['S'],
    preferred: true,
    notes: 'מועדף · הדרום',
  },
  {
    id: 'vendor-pref-plumb-center',
    name: 'אינסטל פלוס',
    contact_phone: '972501100301',
    specialties: 'plumbing',
    coverage_regions: ['TA', 'CTR', 'JLM'],
    preferred: true,
    notes: 'מועדף · מרכז',
  },
  {
    id: 'vendor-pref-plumb-periphery',
    name: 'מים ארצי',
    contact_phone: '972501100302',
    specialties: 'plumbing',
    coverage_regions: ['HFA', 'N', 'S'],
    preferred: true,
    notes: 'מועדף · פריפריה',
  },
  {
    id: 'vendor-pref-it-national',
    name: 'קופה־טק · IT ארצי',
    contact_phone: '972501100401',
    specialties: 'it',
    coverage_regions: [...IL_REGION_CODES],
    preferred: true,
    notes: 'מועדף · כיסוי ארצי לקופות ומחשוב',
  },
  {
    id: 'vendor-pref-security-national',
    name: 'שמור־נט · אבטחה',
    contact_phone: '972501100501',
    specialties: 'security',
    coverage_regions: [...IL_REGION_CODES],
    preferred: true,
    notes: 'מועדף · אזעקות ומערכות אבטחה ארצי',
  },
  {
    id: 'vendor-pref-cleaning-center',
    name: 'ניקיון פרימיום',
    contact_phone: '972501100601',
    specialties: 'cleaning',
    coverage_regions: ['TA', 'CTR', 'JLM'],
    preferred: true,
    notes: 'מועדף · מרכז',
  },
  {
    id: 'vendor-pref-cleaning-periphery',
    name: 'נקי ארץ',
    contact_phone: '972501100602',
    specialties: 'cleaning',
    coverage_regions: ['HFA', 'N', 'S'],
    preferred: true,
    notes: 'מועדף · פריפריה',
  },
]

/** Every IL district must have ≥1 preferred vendor per core trade for the Ari demo. */
export const CORE_TRADES_FOR_COVERAGE = [
  'hvac',
  'electrical',
  'plumbing',
  'it',
  'security',
  'cleaning',
] as const
