/**
 * Canonical Optical Center Israel store directory (48 branches).
 * Codes are the OPC branch numbers (6001… / 907001).
 * Older pilot labels (172 אבן גבירול, 101 שינקין, 102–147) stay as aliases
 * so existing QR / STORE_ messages still open the same branch.
 */

export type IsraelStoreSeed = {
  /** Display code. Text, so a leading zero is kept. */
  code: string
  name: string
  city: string
  /** Short place hint when known; full street address optional. */
  address: string | null
  /** Region code: TA | CTR | JLM | HFA | N | S */
  region: 'TA' | 'CTR' | 'JLM' | 'HFA' | 'N' | 'S'
  /**
   * Stable memory id suffix. Tickets link to this, not to the mutable code.
   * Defaults to `code`.
   */
  stableKey?: string
  /** Previous labels that must still resolve (QR / STORE_ messages). */
  aliases?: readonly string[]
  /** Store manager, Hebrew. */
  managerName: string
  /** Store manager, Latin spelling from the OPC sheet. */
  managerNameEn: string
  /** Store phone as printed (Israeli mobiles normalized to 05X-XXXXXXX). */
  managerPhone: string
  /** Area manager from the OPC sheet. */
  areaManager: string
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
 * 48 OPC branches. Hebrew names are the logical reading of the sheet
 * (the PDF extract reversed word order). Display names omit the repeated
 * "אופטיקל סנטר" suffix.
 */
export const ISRAEL_STORES: readonly IsraelStoreSeed[] = [
  { code: '6001', stableKey: '109', aliases: ['109'], name: 'ירושלים כיכר ציון', city: 'ירושלים', address: 'כיכר ציון', region: 'JLM', managerName: 'קרן', managerNameEn: 'KEREN', managerPhone: '054-7718456', areaManager: 'ונסה' },
  { code: '6002', stableKey: '6002', name: 'ירושלים תלפיות', city: 'ירושלים', address: 'תלפיות', region: 'JLM', managerName: 'סיריל', managerNameEn: 'CYRIL', managerPhone: '050-3574670', areaManager: 'ונסה' },
  { code: '6003', stableKey: '110', aliases: ['110'], name: 'ירושלים גבעת שאול', city: 'ירושלים', address: 'גבעת שאול', region: 'JLM', managerName: 'זהריה', managerNameEn: 'ZAHARYA', managerPhone: '050-5273778', areaManager: 'ונסה' },
  { code: '6004', stableKey: '101', aliases: ['101'], name: 'תל אביב שינקין', city: 'תל אביב', address: 'שינקין', region: 'TA', managerName: 'אמיר', managerNameEn: 'AMIR', managerPhone: '050-3393839', areaManager: 'ונסה' },
  { code: '6005', stableKey: '6005', name: 'חדרה', city: 'חדרה', address: null, region: 'HFA', managerName: 'יעקוב', managerNameEn: 'YAACOV', managerPhone: '058-5966854', areaManager: 'אלכס' },
  { code: '6006', stableKey: '172', aliases: ['172'], name: 'תל אביב אבן גבירול', city: 'תל אביב', address: 'אבן גבירול', region: 'TA', managerName: 'לילך', managerNameEn: 'LILACH', managerPhone: '054-3034415', areaManager: 'ונסה' },
  { code: '6007', stableKey: '105', aliases: ['105'], name: 'ראשון לציון', city: 'ראשון לציון', address: null, region: 'CTR', managerName: 'אלודי', managerNameEn: 'ELODIE', managerPhone: '053-7085277', areaManager: 'ארמנד' },
  { code: '6008', stableKey: '6008', name: 'לוד - רמלה', city: 'רמלה', address: 'לוד - רמלה', region: 'CTR', managerName: 'עומר', managerNameEn: 'OMER', managerPhone: '054-3037498', areaManager: 'ארמנד' },
  { code: '6009', stableKey: '6009', name: 'רמת גן', city: 'רמת גן', address: null, region: 'TA', managerName: 'ארי', managerNameEn: 'HARRY', managerPhone: '050-9881951', areaManager: 'ונסה' },
  { code: '6010', stableKey: '106', aliases: ['106'], name: 'חולון', city: 'חולון', address: null, region: 'TA', managerName: 'אנה', managerNameEn: 'ANNA', managerPhone: '050-5884881', areaManager: 'ונסה' },
  { code: '6011', stableKey: '6011', name: 'רחובות', city: 'רחובות', address: null, region: 'CTR', managerName: 'רחל', managerNameEn: 'RAHEL', managerPhone: '058-5824558', areaManager: 'ארמנד' },
  { code: '6012', stableKey: '6012', name: 'נס ציונה', city: 'נס ציונה', address: null, region: 'CTR', managerName: 'קרלין', managerNameEn: 'CARLINE', managerPhone: '054-9140649', areaManager: 'ארמנד' },
  { code: '6013', stableKey: '116', aliases: ['116'], name: 'אשדוד סטאר-1', city: 'אשדוד', address: 'סטאר-1', region: 'S', managerName: 'ספורה', managerNameEn: 'SEPHORA', managerPhone: '058-7902135', areaManager: 'ארמנד' },
  { code: '6014', stableKey: '6014', name: 'אשקלון', city: 'אשקלון', address: null, region: 'S', managerName: 'איילת', managerNameEn: 'AYELETTE', managerPhone: '054-9448071', areaManager: 'ארמנד' },
  { code: '6015', stableKey: '102', aliases: ['102'], name: 'בני ברק', city: 'בני ברק', address: null, region: 'TA', managerName: 'יוסף', managerNameEn: 'YOSSEF', managerPhone: '053-3657315', areaManager: 'ארמנד' },
  { code: '6016', stableKey: '6016', name: 'נתיבות', city: 'נתיבות', address: null, region: 'S', managerName: 'עירית', managerNameEn: 'IRIT', managerPhone: '052-6753399', areaManager: 'ארמנד' },
  { code: '6017', stableKey: '115', aliases: ['115'], name: 'באר שבע MALL7', city: 'באר שבע', address: 'MALL7', region: 'S', managerName: 'ענת', managerNameEn: 'ANAT', managerPhone: '054-4404795', areaManager: 'ונסה' },
  { code: '6018', stableKey: '6018', name: 'כרמיאל', city: 'כרמיאל', address: null, region: 'N', managerName: 'איה', managerNameEn: 'AYA', managerPhone: '050-22840204', areaManager: 'אלכס' },
  { code: '6019', stableKey: '6019', name: 'רגבה', city: 'רגבה', address: null, region: 'N', managerName: 'אורלי', managerNameEn: 'ORLY', managerPhone: '052-2850777', areaManager: 'אלכס' },
  { code: '6020', stableKey: '6020', name: 'באר שבע MAX', city: 'באר שבע', address: 'MAX', region: 'S', managerName: 'יהודית', managerNameEn: 'YEHOUDIT', managerPhone: '050-8342057', areaManager: 'ונסה' },
  { code: '6021', stableKey: '6021', name: 'ראשון לציון 2', city: 'ראשון לציון', address: null, region: 'CTR', managerName: 'אלודי', managerNameEn: 'ELODIE', managerPhone: '053-7085277', areaManager: 'ארמנד' },
  { code: '6022', stableKey: '6022', name: 'אשדוד סיטי', city: 'אשדוד', address: 'סיטי', region: 'S', managerName: 'ג׳רמי', managerNameEn: 'JEREMIE', managerPhone: '058-4840787', areaManager: 'ארמנד' },
  { code: '6023', stableKey: '114', aliases: ['114'], name: 'עפולה', city: 'עפולה', address: null, region: 'N', managerName: 'מרווה', managerNameEn: 'MARWA', managerPhone: '053-2805424', areaManager: 'אלכס' },
  { code: '6024', stableKey: '103', aliases: ['103'], name: 'הרצליה', city: 'הרצליה', address: null, region: 'TA', managerName: 'סטפן', managerNameEn: 'STEPHANE', managerPhone: '058-7574485', areaManager: 'ונסה' },
  { code: '6025', stableKey: '6025', name: 'נתניה', city: 'נתניה', address: null, region: 'CTR', managerName: 'קים', managerNameEn: 'KIM', managerPhone: '052-8240031', areaManager: 'אלכס' },
  { code: '6026', stableKey: '6026', name: 'רעננה', city: 'רעננה', address: null, region: 'CTR', managerName: 'פייר', managerNameEn: 'PIERRE', managerPhone: '050-3726253', areaManager: 'ונסה' },
  { code: '6027', stableKey: '6027', name: 'טבריה', city: 'טבריה', address: null, region: 'N', managerName: 'קובי', managerNameEn: 'KOBBI', managerPhone: '050-8484818', areaManager: 'אלכס' },
  { code: '6029', stableKey: '6029', name: 'קרית שמונה', city: 'קרית שמונה', address: null, region: 'N', managerName: 'עדן', managerNameEn: 'EDEN', managerPhone: '054-6807077', areaManager: 'אלכס' },
  { code: '6030', stableKey: '108', aliases: ['108'], name: 'כפר סבא עתיר 1', city: 'כפר סבא', address: 'עתיר 1', region: 'CTR', managerName: 'סטפני', managerNameEn: 'STEPHANIE', managerPhone: '054-5500625', areaManager: 'ארמנד' },
  { code: '6031', stableKey: '6031', name: 'רמת השרון', city: 'רמת השרון', address: null, region: 'TA', managerName: 'אריאלה', managerNameEn: 'ARIELLA', managerPhone: '058-7700312', areaManager: 'ונסה' },
  { code: '6032', stableKey: '6032', name: 'בת ים מרכז', city: 'בת ים', address: 'מרכז', region: 'TA', managerName: 'שי', managerNameEn: 'SHAY', managerPhone: '054-2527671', areaManager: 'ונסה' },
  { code: '6033', stableKey: '104', aliases: ['104'], name: 'בת ים פארק', city: 'בת ים', address: 'פארק', region: 'TA', managerName: 'מנו', managerNameEn: 'MANU', managerPhone: '058-5201014', areaManager: 'ונסה' },
  { code: '6034', stableKey: '6034', name: 'נוף הגליל', city: 'נוף הגליל', address: null, region: 'N', managerName: 'מרווה', managerNameEn: 'MARWA', managerPhone: '053-2805424', areaManager: 'אלכס' },
  { code: '6035', stableKey: '107', aliases: ['107'], name: 'פתח תקווה', city: 'פתח תקווה', address: null, region: 'CTR', managerName: 'סימה', managerNameEn: 'SIMA', managerPhone: '050-8592997', areaManager: 'ארמנד' },
  { code: '6036', stableKey: '6036', name: 'אריאל', city: 'אריאל', address: null, region: 'CTR', managerName: 'בת אל', managerNameEn: 'BATHEL', managerPhone: '052-5348138', areaManager: 'אלכס' },
  { code: '6037', stableKey: '111', aliases: ['111'], name: 'חיפה הרצל', city: 'חיפה', address: 'הרצל', region: 'HFA', managerName: 'אנג׳לינה', managerNameEn: 'ANGELINA', managerPhone: '054-4448747', areaManager: 'אלכס' },
  { code: '6038', stableKey: '6038', name: 'בילו', city: 'קרית עקרון', address: 'בילו', region: 'CTR', managerName: 'גילה', managerNameEn: 'GUILA', managerPhone: '050-2441687', areaManager: 'ארמנד' },
  { code: '6039', stableKey: '6039', name: 'עכו', city: 'עכו', address: null, region: 'N', managerName: 'גיל', managerNameEn: 'GIL', managerPhone: '053-2311226', areaManager: 'אלכס' },
  { code: '6040', stableKey: '6040', name: 'מגדל העמק', city: 'מגדל העמק', address: null, region: 'N', managerName: 'רפאל', managerNameEn: 'REPHAEL', managerPhone: '055-7717302', areaManager: 'אלכס' },
  { code: '6041', stableKey: '112', aliases: ['112'], name: 'חיפה ביג', city: 'חיפה', address: 'ביג', region: 'HFA', managerName: 'גיא', managerNameEn: 'GUY', managerPhone: '054-6592119', areaManager: 'אלכס' },
  { code: '6042', stableKey: '6042', name: 'דימונה', city: 'דימונה', address: null, region: 'S', managerName: 'ניקול', managerNameEn: 'NICOLE', managerPhone: '050-7301133', areaManager: 'ונסה' },
  { code: '6043', stableKey: '113', aliases: ['113'], name: 'יקנעם', city: 'יקנעם', address: null, region: 'N', managerName: 'אמיר', managerNameEn: 'AMIR', managerPhone: '054-4351524', areaManager: 'אלכס' },
  { code: '6045', stableKey: '6045', name: 'פרדס חנה', city: 'פרדס חנה', address: null, region: 'HFA', managerName: 'רותי', managerNameEn: 'RUTHY', managerPhone: '054-2154285', areaManager: 'אלכס' },
  { code: '6046', stableKey: '6046', name: 'כפר סבא ויצמן 2', city: 'כפר סבא', address: 'ויצמן 2', region: 'CTR', managerName: 'סטפני', managerNameEn: 'STEPHANIE', managerPhone: '054-5500625', areaManager: 'ארמנד' },
  { code: '6047', stableKey: '6047', name: 'חולון הסיירים 2', city: 'חולון', address: 'הסיירים 2', region: 'TA', managerName: 'הודיה', managerNameEn: 'HODAYA', managerPhone: '054-6855683', areaManager: 'ונסה' },
  { code: '6048', stableKey: '6048', name: 'קרית אתא', city: 'קרית אתא', address: null, region: 'HFA', managerName: 'יעל', managerNameEn: 'YAEL', managerPhone: '052-4728881', areaManager: 'אלכס' },
  { code: '6050', stableKey: '6050', name: 'בית שמש', city: 'בית שמש', address: null, region: 'JLM', managerName: 'שרה', managerNameEn: 'SARAH', managerPhone: '053-2841471', areaManager: 'ארמנד' },
  { code: '907001', stableKey: '907001', name: 'מודיעין', city: 'מודיעין', address: null, region: 'CTR', managerName: 'אליעזר', managerNameEn: 'ELIEZER', managerPhone: '053-9674595', areaManager: 'ונסה' },
] as const

export function israelStoreId(codeOrKey: string): string {
  const store = ISRAEL_STORES.find(
    (s) =>
      s.code === codeOrKey ||
      s.stableKey === codeOrKey ||
      s.aliases?.includes(codeOrKey),
  )
  return `il-store-${store?.stableKey ?? codeOrKey}`
}

/** Map a legacy or current label to the approved store code. */
export function canonicalStoreCode(input: string): string {
  const trimmed = input.trim()
  const store = ISRAEL_STORES.find(
    (s) => s.code === trimmed || s.aliases?.includes(trimmed),
  )
  return store?.code ?? trimmed
}

export function israelStoresAsRows(): {
  id: string
  code: string
  name: string
  city: string | null
  address: string | null
  region_id: string
  is_active: boolean
  manager_name: string
  manager_name_en: string
  manager_phone: string
  area_manager: string
}[] {
  return ISRAEL_STORES.map((s) => ({
    id: israelStoreId(s.stableKey ?? s.code),
    code: s.code,
    name: s.name,
    city: s.city,
    address: s.address,
    region_id: REGION_SLUG[s.region],
    is_active: true,
    manager_name: s.managerName,
    manager_name_en: s.managerNameEn,
    manager_phone: s.managerPhone,
    area_manager: s.areaManager,
  }))
}
