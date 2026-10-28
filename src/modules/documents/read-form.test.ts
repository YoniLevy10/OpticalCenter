import { describe, expect, it } from 'vitest'
import { ISRAEL_STORES } from '@/modules/stores/israel-stores'
import { runIngestPipeline } from '@/modules/ingestion/pipeline'
import { readHearingForm } from './read-form'

const codes = ISRAEL_STORES.map((store) => store.code)

describe('readHearingForm', () => {
  it('reads a booth letter and ignores the lab street', () => {
    const form = readHearingForm(
      'מחלקת שירות 11/02/2025 לכבוד אופטיקל סðטר רעððה סðיף חוות דעת 11/02/2027תוקף בדיקת התא 11/02/2026 תוקף כיול רח יוני נתניהו',
    )
    expect(form.kind).toBe('hearing_booth')
    expect(form.storeCode).toBe('6026')
    expect(form.expiry).toBe('2027-02-11')
    expect(form.calibrationExpiry).toBe('2026-02-11')
    expect(form.confident).toBe(true)
  })

  it('assigns a glued city and a reversed beer sheva mall', () => {
    expect(
      readHearingForm('S\\N: 24003482 בבני ברק 128 שרבי עקיבא אופטיקל סנטר סניף 27/05/2027תוקף הבדיקה אודיומטריםטופס').storeCode,
    ).toBe('6015')
    expect(
      readHearingForm('שבמול שבע באר אופטיקל סנטר סניף מיקום 27/04/2026תוקף הבדיקה אודיומטר').storeCode,
    ).toBe('6017')
    expect(
      readHearingForm('שבנס ציונה הפטיש אופטיקל סנטר מיקום 10/03/2027תוקף הבדיקה אודיומטר').storeCode,
    ).toBe('6012')
  })

  it('separates two branches in one city', () => {
    expect(
      readHearingForm('אופטיקל סנטר אשדוד סניף חוות דעת שבסטאר סנטר באשדוד .23/02/2027תוקף בדיקת התא').storeCode,
    ).toBe('6013')
    expect(
      readHearingForm('אופטיקל סנטר כפר סבא סניף חוות דעת כפר סבא 2עתיר .22/01/2027תוקף בדיקת התא').storeCode,
    ).toBe('6030')
    expect(
      readHearingForm('אופטיקל סנטר כפר סבא סניף חוות דעת כפר סבא 88ויצמן .17/06/2027תוקף בדיקת התא').storeCode,
    ).toBe('6046')
    expect(
      readHearingForm('אופטיקל סנטר בת ים חוות דעת בת ים 37 שברחוב רב ניסנבאום .29/01/2027תוקף בדיקת התא').storeCode,
    ).toBe('6032')
    expect(
      readHearingForm('אופטיקל סנטר ירושלים חוות דעת שבכיכר ציון בירושלים 18/09/2027 תוקף הבדיקה').storeCode,
    ).toBe('6001')
    expect(
      readHearingForm('אופטיקל סנטר חיפה חוות דעת 111שבביג צק פוסט 19/10/2028תוקף בדיקת התא').storeCode,
    ).toBe('6041')
  })

  it('keeps an unclear ashkelon sea-mall line for review', () => {
    const form = readHearingForm(
      'באשדוד שבסימול אופטיקל סנטר סניף 18/06/2026תוקף הבדיקה אודיומטר',
    )
    expect(form.storeCode).toBeNull()
    expect(form.confident).toBe(false)
    expect(form.reason).toContain('אשדוד')
  })

  it('uses the findings line when the letterhead names another mall', () => {
    expect(
      readHearingForm(
        'מקס אמות לכבוד אופטיקל סנטר באר שבע סניף חוות דעת ולהלן ממצאי : באר שבע 7שבמרכז מול 05/02/2026תוקף בדיקת התא',
      ).storeCode,
    ).toBe('6017')
    expect(
      readHearingForm(
        'מקס אמות לכבוד אופטיקל סנטר באר שבע סניף חוות דעת ולהלן ממצאי : בבאר שבע שבמקס אמות 05/02/2026תוקף בדיקת התא',
      ).storeCode,
    ).toBe('6020')
    expect(
      readHearingForm('S\\N: 24004976 עקרון אופטיקל סנטר סניף 22/06/2026 תוקף הבדיקה אודיומטר').storeCode,
    ).toBe('6038')
  })

  it('reads a split expiry date', () => {
    const form = readHearingForm(
      'אופטיקל סנטר יקנעם סניף חוות דעת 18/10/2028 8.2 תוקף בדיקת התא',
    )
    expect(form.storeCode).toBe('6043')
    expect(form.expiry).toBe('2028-10-18')
  })

  it('files the form on the store when the pipeline only has the text', () => {
    const file = runIngestPipeline({
      id: 'h',
      name: 'scan.pdf',
      mime: 'application/pdf',
      extractedText: 'לכבוד אופטיקל סנטר רעננה סניף חוות דעת 11/02/2027תוקף בדיקת התא',
      knownStoreCodes: codes,
      existingNames: [],
    })
    expect(file.docType).toBe('hearing_booth')
    expect(file.storeCode).toBe('6026')
    expect(file.status).toBe('ingested')
  })
})
