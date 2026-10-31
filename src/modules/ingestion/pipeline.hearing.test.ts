import { describe, expect, it } from 'vitest'
import { identifyFile } from './pipeline'

describe('C08 hearing calibration ingest hints', () => {
  it('maps instrument names, כיול א/ב/ג, and hearing_a/b/c', () => {
    expect(identifyFile('כיול א - 6018.pdf', 'application/pdf')).toBe('hearing_a')
    expect(identifyFile('סניף-כיול-ב.pdf', 'application/pdf')).toBe('hearing_b')
    expect(identifyFile('כיולג_כרמיאל.pdf', 'application/pdf')).toBe('hearing_c')
    expect(identifyFile('hearing_a_6018.pdf', 'application/pdf')).toBe('hearing_a')
    expect(identifyFile('hearing-b report.pdf', 'application/pdf')).toBe('hearing_b')
    expect(identifyFile('Hearing_C.pdf', 'application/pdf')).toBe('hearing_c')
    expect(identifyFile('טימפונומטר דימונה 25.pdf', 'application/pdf')).toBe('hearing_a')
    expect(identifyFile('אודיומטר אשדוד.pdf', 'application/pdf')).toBe('hearing_b')
    expect(identifyFile('תא אקוסטי כרמיאל.pdf', 'application/pdf')).toBe('hearing_c')
  })

  it('does not treat a city name as a fire certificate', () => {
    expect(identifyFile('אופטיקל סנטר אשקלון.pdf', 'application/pdf')).toBeNull()
    expect(identifyFile('אופטיקל סנטר אשדוד.pdf', 'application/pdf')).toBeNull()
  })

  it('leaves a file that names two instruments without a single type', () => {
    expect(identifyFile('אודיומטר וטימפנומטר אשדוד.pdf', 'application/pdf')).toBeNull()
  })

  it('falls back to legacy hearing for generic שמיעה', () => {
    expect(identifyFile('מערכות שמיעה שנתי.pdf', 'application/pdf')).toBe('hearing')
    expect(identifyFile('hearing-annual.pdf', 'application/pdf')).toBe('hearing')
  })
})
