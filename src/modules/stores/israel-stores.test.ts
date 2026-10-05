import { describe, expect, it } from 'vitest'
import {
  ISRAEL_STORES,
  canonicalStoreCode,
  israelStoreId,
  israelStoresAsRows,
} from '@/modules/stores/israel-stores'

describe('ISRAEL_STORES', () => {
  it('has exactly 48 unique active branches', () => {
    expect(ISRAEL_STORES).toHaveLength(48)
    const codes = ISRAEL_STORES.map((s) => s.code)
    expect(new Set(codes).size).toBe(48)
  })

  it('uses OPC branch codes and keeps legacy labels as aliases', () => {
    const byCode = Object.fromEntries(ISRAEL_STORES.map((s) => [s.code, s]))
    expect(byCode['6006']?.name).toMatch(/אבן גבירול/)
    expect(byCode['6004']?.name).toMatch(/שינקין/)
    expect(byCode['907001']?.city).toBe('מודיעין')
    expect(canonicalStoreCode('172')).toBe('6006')
    expect(canonicalStoreCode('101')).toBe('6004')
    expect(israelStoreId('172')).toBe('il-store-172')
    expect(israelStoreId('6006')).toBe('il-store-172')
  })

  it('applies the approved code and name corrections without moving the store id', () => {
    const byCode = Object.fromEntries(ISRAEL_STORES.map((s) => [s.code, s]))
    expect(byCode['6030']?.name).toBe('כפר סבא עתיר 1')
    expect(byCode['6045']?.city).toBe('פרדס חנה')
    expect(byCode['6018']?.name).toBe('כרמיאל')
    expect(byCode['6018']?.managerName).toBe('איה')
    expect(israelStoreId('6030')).toBe('il-store-108')
    expect(israelStoreId('108')).toBe('il-store-108')
    expect(israelStoreId('6018')).toBe('il-store-6018')
  })

  it('maps memory ids as il-store-{stableKey}', () => {
    expect(israelStoreId('6006')).toBe('il-store-172')
    const rows = israelStoresAsRows()
    expect(rows).toHaveLength(48)
    expect(rows.every((r) => r.is_active && r.id.startsWith('il-store-'))).toBe(
      true,
    )
  })
})
