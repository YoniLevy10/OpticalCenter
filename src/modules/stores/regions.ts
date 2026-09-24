/** Israel district codes used across stores + preferred vendors. */

export const IL_REGION_CODES = ['TA', 'CTR', 'JLM', 'HFA', 'N', 'S'] as const

export type IlRegionCode = (typeof IL_REGION_CODES)[number]

export const IL_REGION_LABELS_HE: Record<IlRegionCode, string> = {
  TA: 'תל אביב',
  CTR: 'המרכז',
  JLM: 'ירושלים',
  HFA: 'חיפה',
  N: 'הצפון',
  S: 'הדרום',
}

/** Memory slug ↔ district code */
export const REGION_SLUG_TO_CODE: Record<string, IlRegionCode> = {
  ta: 'TA',
  ctr: 'CTR',
  jlm: 'JLM',
  hfa: 'HFA',
  n: 'N',
  s: 'S',
}

/** Stable seed UUIDs from migrations ↔ district code */
export const REGION_UUID_TO_CODE: Record<string, IlRegionCode> = {
  '33333333-3333-3333-3333-333333333301': 'TA',
  '33333333-3333-3333-3333-333333333302': 'CTR',
  '33333333-3333-3333-3333-333333333303': 'JLM',
  '33333333-3333-3333-3333-333333333304': 'HFA',
  '33333333-3333-3333-3333-333333333305': 'N',
  '33333333-3333-3333-3333-333333333306': 'S',
}

export function regionCodeFromId(regionId: string | null | undefined): IlRegionCode | null {
  if (!regionId) return null
  const lower = regionId.toLowerCase()
  if (REGION_SLUG_TO_CODE[lower]) return REGION_SLUG_TO_CODE[lower]
  if (REGION_UUID_TO_CODE[regionId]) return REGION_UUID_TO_CODE[regionId]
  const upper = regionId.toUpperCase()
  if ((IL_REGION_CODES as readonly string[]).includes(upper)) {
    return upper as IlRegionCode
  }
  return null
}

export function regionLabelHe(regionIdOrCode: string | null | undefined): string {
  const code = regionCodeFromId(regionIdOrCode) ?? null
  if (!code) return '—'
  return IL_REGION_LABELS_HE[code]
}

export function isIlRegionCode(value: string): value is IlRegionCode {
  return (IL_REGION_CODES as readonly string[]).includes(value.toUpperCase())
}
