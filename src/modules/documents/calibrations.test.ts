import { describe, expect, it } from 'vitest'
import { ISRAEL_STORES } from '@/modules/stores/israel-stores'
import {
  calibrationIntake,
  matchStoreFromLabel,
  splitCalibrations,
  unclassifiedCertificateLabel,
} from './calibrations'

const stores = ISRAEL_STORES.map((store) => ({
  code: store.code,
  name: store.name,
  city: store.city,
}))

describe('Ari hearing calibrations', () => {
  it('splits one certificate that names two instruments, each with its own expiry', () => {
    const slices = splitCalibrations(
      'אישור אשדוד.pdf',
      `
אודיומטר
תאריך כיול: 01/03/2025
תוקף: 01/03/2026
טימפנומטר
תאריך כיול: 02/04/2025
תוקף: 02/04/2026
`,
    )
    expect(slices.map((row) => row.docType)).toEqual(['hearing_b', 'hearing_a'])
    expect(slices[0]).toMatchObject({
      expiry: '2026-03-01T00:00:00.000Z',
      expirySource: 'stated',
    })
    expect(slices[1]).toMatchObject({
      expiry: '2026-04-02T00:00:00.000Z',
      expirySource: 'stated',
    })
  })

  it('adds 24 months for an acoustic booth dated only with the calibration day', () => {
    const [slice] = splitCalibrations('תא אקוסטי כרמיאל.pdf', 'תאריך כיול 15/01/2024')
    expect(slice).toMatchObject({
      docType: 'hearing_c',
      expiry: '2026-01-15T00:00:00.000Z',
      expirySource: 'computed',
    })
    expect(calibrationIntake(slice, '6018').intakeReason).toMatch(/מחזור/)
  })

  it('keeps a yearly instrument on a 12 month cycle when the expiry is not printed', () => {
    const [slice] = splitCalibrations('טימפנומטר דימונה.pdf', 'תאריך כיול: 10/06/2025')
    expect(slice.expiry).toBe('2026-06-10T00:00:00.000Z')
  })

  it('does not invent an expiry when several dates are unlabeled', () => {
    const [slice] = splitCalibrations('אודיומטר נתניה.pdf', '01/02/2025 וגם 01/02/2026')
    expect(slice.expiry).toBeNull()
    expect(calibrationIntake(slice, '6025').intakeReason).toBe('תאריך התוקף לא ברור')
  })

  it('recognizes store names the way Ari named the files', () => {
    expect(matchStoreFromLabel('אודיומטר אשדוד.pdf', stores)).toEqual({
      code: null,
      ambiguous: true,
    })
    expect(matchStoreFromLabel('אודיומטר אשדוד סטר סנטר 26.pdf', stores).code).toBe('6013')
    expect(matchStoreFromLabel('אודיומטר מול שבע 25.pdf', stores).code).toBe('6017')
    expect(matchStoreFromLabel('טימפונומטר דימונה 25.pdf', stores).code).toBe('6042')
    expect(matchStoreFromLabel('אופטיקל סנטר כפר סבא ויצמן.pdf', stores).code).toBe('6046')
    expect(matchStoreFromLabel('אופטיקל סנטר חולון 2024.pdf', stores).code).toBe('6010')
    expect(matchStoreFromLabel('אודיומטר גבעת שאול 26.pdf', stores).code).toBe('6003')
    expect(matchStoreFromLabel('אופטיקל סנטר שנקין.pdf', stores).code).toBe('6004')
    expect(matchStoreFromLabel('אופטיקל סנטר קריית עקרון 24.pdf', stores).code).toBe('6038')
    expect(matchStoreFromLabel('כיול א - 6018.pdf', stores).code).toBe('6018')
    expect(matchStoreFromLabel('אופטיקל סנטר מודעין 2025.pdf', stores).code).toBe('907001')
    expect(matchStoreFromLabel('אופטיקל סנטרמגדל העמק 2025.pdf', stores).code).toBe('6040')
    expect(matchStoreFromLabel('אודיומטר רמלה25.pdf', stores).code).toBe('6008')
    expect(matchStoreFromLabel('אודיומטר חונים קונים 25.pdf', stores).code).toBe('6007')
    expect(matchStoreFromLabel('אופטיקל סנטרראשון זבוטינסקי 26.pdf', stores).code).toBe('6021')
    expect(matchStoreFromLabel('אופטיקל סנטר חיפה צק פסט 2026.pdf', stores).code).toBe('6041')
  })

  it('does not guess which hearing store a bare city name belongs to', () => {
    expect(matchStoreFromLabel('אופטיקל סנטר אשדוד 25.pdf', stores).code).toBeNull()
    expect(matchStoreFromLabel('אופטיקל סנטר בת ים.pdf', stores).code).toBeNull()
    expect(matchStoreFromLabel('אופטיקל סנטר כפר סבא 25.pdf', stores).code).toBeNull()
  })

  it('holds a store-named certificate until the instruments inside it are known', () => {
    expect(unclassifiedCertificateLabel('25אופטיקל סנטר אשקלון.pdf')).toMatch(/אשקלון/)
    expect(unclassifiedCertificateLabel('אודיומטר אשקלון.pdf')).toBeNull()
  })
})
