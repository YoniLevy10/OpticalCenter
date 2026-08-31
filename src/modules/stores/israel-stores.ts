/**
 * Canonical Optical Center Israel store directory (48 branches).
 * Codes are numeric for WhatsApp `STORE_{code}` / QR deep links.
 * 172 = תל אביב אבן גבירול, 101 = תל אביב שינקין (legacy pilot codes).
 */

export type IsraelStoreSeed = {
  code: string
  name: string
  city: string
  /** Short place hint when known; full street address optional. */
  address: string | null
  /** Region code: TA | CTR | JLM | HFA | N | S */
  region: 'TA' | 'CTR' | 'JLM' | 'HFA' | 'N' | 'S'
}

/** Memory / fallback region_id slugs used when DB regions are not loaded. */
export const REGION_SLUG: Record<IsraelStoreSeed['region'], string> = {
  TA: 'ta',
  CTR: 'ctr',
  JLM: 'jlm',
  HFA: 'hfa',
  N: 'n',
  S: 's',
}

export const IL_COUNTRY_ID = '22222222-2222-2222-2222-222222222222'
export const IL_ORG_ID = '11111111-1111-1111-1111-111111111111'

export const IL_REGION_IDS: Record<IsraelStoreSeed['region'], string> = {
  TA: '33333333-3333-3333-3333-333333333301',
  CTR: '33333333-3333-3333-3333-333333333302',
  JLM: '33333333-3333-3333-3333-333333333303',
  HFA: '33333333-3333-3333-3333-333333333304',
  N: '33333333-3333-3333-3333-333333333305',
  S: '33333333-3333-3333-3333-333333333306',
}

/**
 * 48 real IL branches provided by Optical Center ops.
 * Display names omit the repeated "אופטיקה / אופטיקל סנטר" suffix.
 */
export const ISRAEL_STORES: readonly IsraelStoreSeed[] = [
  { code: '102', name: 'נתניה פולג', city: 'נתניה', address: 'פולג', region: 'CTR' },
  { code: '103', name: 'כפר סבא', city: 'כפר סבא', address: null, region: 'CTR' },
  { code: '104', name: 'כפר סבא עתיר ידע', city: 'כפר סבא', address: 'עתיר ידע', region: 'CTR' },
  { code: '105', name: 'פתח תקווה סגולה', city: 'פתח תקווה', address: 'סגולה', region: 'CTR' },
  { code: '106', name: 'רעננה', city: 'רעננה', address: null, region: 'CTR' },
  { code: '107', name: 'מודיעין', city: 'מודיעין', address: null, region: 'CTR' },
  { code: '108', name: 'רמלה', city: 'רמלה', address: null, region: 'CTR' },
  { code: '109', name: 'נס ציונה', city: 'נס ציונה', address: null, region: 'CTR' },
  { code: '110', name: 'בילו סנטר', city: 'קרית עקרון', address: 'בילו סנטר', region: 'CTR' },
  { code: '111', name: 'ראשון לציון', city: 'ראשון לציון', address: null, region: 'CTR' },
  { code: '112', name: 'ראשון לציון ז׳בוטינסקי', city: 'ראשון לציון', address: 'ז׳בוטינסקי', region: 'CTR' },
  { code: '113', name: 'רחובות', city: 'רחובות', address: null, region: 'CTR' },
  { code: '114', name: 'בת ים מרכז העיר', city: 'בת ים', address: 'מרכז העיר', region: 'TA' },
  { code: '115', name: 'בת ים פארק הים', city: 'בת ים', address: 'פארק הים', region: 'TA' },
  { code: '116', name: 'חולון', city: 'חולון', address: null, region: 'TA' },
  { code: '117', name: 'חולון הסיירים', city: 'חולון', address: 'הסיירים', region: 'TA' },
  { code: '118', name: 'ביג פרדס חנה', city: 'פרדס חנה', address: 'ביג', region: 'HFA' },
  { code: '119', name: 'חיפה ביג צ׳ק פוסט', city: 'חיפה', address: 'ביג צ׳ק פוסט', region: 'HFA' },
  { code: '120', name: 'חיפה הרצל', city: 'חיפה', address: 'הרצל', region: 'HFA' },
  { code: '121', name: 'קרית אתא', city: 'קרית אתא', address: null, region: 'HFA' },
  { code: '122', name: 'בית שמש', city: 'בית שמש', address: null, region: 'JLM' },
  { code: '123', name: 'ירושלים גבעת שאול', city: 'ירושלים', address: 'גבעת שאול', region: 'JLM' },
  { code: '124', name: 'ירושלים כיכר ציון', city: 'ירושלים', address: 'כיכר ציון', region: 'JLM' },
  { code: '125', name: 'ירושלים תלפיות', city: 'ירושלים', address: 'תלפיות', region: 'JLM' },
  { code: '126', name: 'כרמיאל', city: 'כרמיאל', address: null, region: 'N' },
  { code: '127', name: 'עכו עזריאלי', city: 'עכו', address: 'עזריאלי', region: 'N' },
  { code: '128', name: 'ביג רגבה', city: 'רגבה', address: 'ביג', region: 'N' },
  { code: '129', name: 'טבריה', city: 'טבריה', address: null, region: 'N' },
  { code: '130', name: 'קרית שמונה', city: 'קרית שמונה', address: null, region: 'N' },
  { code: '131', name: 'יקנעם', city: 'יקנעם', address: null, region: 'N' },
  { code: '132', name: 'מגדל העמק', city: 'מגדל העמק', address: null, region: 'N' },
  { code: '133', name: 'נוף הגליל', city: 'נוף הגליל', address: null, region: 'N' },
  { code: '134', name: 'עפולה', city: 'עפולה', address: null, region: 'N' },
  { code: '135', name: 'אשדוד', city: 'אשדוד', address: null, region: 'S' },
  { code: '136', name: 'אשדוד הסיטי', city: 'אשדוד', address: 'הסיטי', region: 'S' },
  { code: '137', name: 'אשקלון סילבר', city: 'אשקלון', address: 'סילבר', region: 'S' },
  { code: '138', name: 'באר שבע', city: 'באר שבע', address: null, region: 'S' },
  { code: '139', name: 'באר שבע מיקס', city: 'באר שבע', address: 'מיקס', region: 'S' },
  { code: '140', name: 'דימונה פרץ', city: 'דימונה', address: 'פרץ', region: 'S' },
  { code: '141', name: 'בני ברק', city: 'בני ברק', address: null, region: 'TA' },
  { code: '142', name: 'הרצליה', city: 'הרצליה', address: null, region: 'TA' },
  { code: '143', name: 'רמת גן ביאליק', city: 'רמת גן', address: 'ביאליק', region: 'TA' },
  { code: '144', name: 'רמת השרון', city: 'רמת השרון', address: null, region: 'TA' },
  // Legacy pilot QR / WhatsApp codes kept stable:
  { code: '172', name: 'תל אביב אבן גבירול', city: 'תל אביב', address: 'אבן גבירול', region: 'TA' },
  { code: '101', name: 'תל אביב שינקין', city: 'תל אביב', address: 'שינקין', region: 'TA' },
  { code: '145', name: 'אריאל', city: 'אריאל', address: null, region: 'CTR' },
  { code: '146', name: 'נתיבות', city: 'נתיבות', address: null, region: 'S' },
  { code: '147', name: 'חדרה מיקס שופינג', city: 'חדרה', address: 'מיקס שופינג', region: 'HFA' },
] as const

export function israelStoreId(code: string): string {
  return `il-store-${code}`
}

export function israelStoresAsRows(): {
  id: string
  code: string
  name: string
  city: string | null
  address: string | null
  region_id: string
  is_active: boolean
}[] {
  return ISRAEL_STORES.map((s) => ({
    id: israelStoreId(s.code),
    code: s.code,
    name: s.name,
    city: s.city,
    address: s.address,
    region_id: REGION_SLUG[s.region],
    is_active: true,
  }))
}
