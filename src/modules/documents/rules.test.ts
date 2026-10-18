import { describe, expect, it } from 'vitest'
import {
  DOCUMENT_TYPES,
  documentNeedsReminder,
  documentTypeLabel,
  isDocumentDueSoon,
  isDocumentOverdue,
  isHearingCalibrationType,
  selectableDocumentTypes,
  type StoreDocument,
} from './rules'

function doc(patch: Partial<StoreDocument> = {}): StoreDocument {
  return {
    id: 'd1',
    storeId: 's',
    storeCode: '6018',
    storeName: 'כרמיאל',
    docType: 'hearing_a',
    sourceUrl: 'https://drive/x',
    extractedExpiry: '2026-11-15T00:00:00.000Z',
    computedNextCheck: null,
    owner: 'ארי',
    intakeStatus: 'ingested',
    intakeReason: null,
    version: 1,
    previousId: null,
    renewed: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...patch,
  }
}

describe('C08 hearing calibrations', () => {
  it('exposes כיול א/ב/ג as selectable types', () => {
    const keys = selectableDocumentTypes().map((row) => row.key)
    expect(keys).toContain('hearing_a')
    expect(keys).toContain('hearing_b')
    expect(keys).toContain('hearing_c')
    expect(keys).not.toContain('hearing')
    expect(documentTypeLabel('hearing_a')).toBe('כיול א')
    expect(documentTypeLabel('hearing_b')).toBe('כיול ב')
    expect(documentTypeLabel('hearing_c')).toBe('כיול ג')
    expect(isHearingCalibrationType('hearing_a')).toBe(true)
    expect(isHearingCalibrationType('fire')).toBe(false)
  })

  it('keeps legacy hearing in DOCUMENT_TYPES for existing rows', () => {
    expect(DOCUMENT_TYPES.some((row) => row.key === 'hearing')).toBe(true)
    expect(documentTypeLabel('hearing')).toMatch(/ישן/)
  })

  it('flags month-ahead due-soon for calibrations (~30 days)', () => {
    const now = new Date('2026-10-20T12:00:00.000Z')
    const soon = doc({ extractedExpiry: '2026-11-10T00:00:00.000Z', docType: 'hearing_b' })
    const far = doc({ extractedExpiry: '2027-06-01T00:00:00.000Z', docType: 'hearing_c' })
    const fireSoon = doc({
      extractedExpiry: '2026-11-10T00:00:00.000Z',
      docType: 'fire',
    })
    expect(isDocumentDueSoon(soon, now)).toBe(true)
    expect(isDocumentOverdue(soon, now)).toBe(false)
    expect(documentNeedsReminder(soon, now)).toBe(true)
    expect(isDocumentDueSoon(far, now)).toBe(false)
    expect(isDocumentDueSoon(fireSoon, now)).toBe(false)
  })

  it('does not treat overdue as due-soon', () => {
    const now = new Date('2026-10-20T12:00:00.000Z')
    const overdue = doc({ extractedExpiry: '2026-09-01T00:00:00.000Z' })
    expect(isDocumentOverdue(overdue, now)).toBe(true)
    expect(isDocumentDueSoon(overdue, now)).toBe(false)
    expect(documentNeedsReminder(overdue, now)).toBe(true)
  })
})
