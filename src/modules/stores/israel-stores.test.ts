import { describe, expect, it } from 'vitest'
import {
  ISRAEL_STORES,
  israelStoreId,
  israelStoresAsRows,
} from '@/modules/stores/israel-stores'

describe('ISRAEL_STORES', () => {
  it('has exactly 48 unique active branches', () => {
    expect(ISRAEL_STORES).toHaveLength(48)
    const codes = ISRAEL_STORES.map((s) => s.code)
    expect(new Set(codes).size).toBe(48)
  })

  it('keeps legacy pilot codes 101 and 172', () => {
    const byCode = Object.fromEntries(ISRAEL_STORES.map((s) => [s.code, s]))
    expect(byCode['172']?.name).toMatch(/אבן גבירול/)
    expect(byCode['101']?.name).toMatch(/שינקין/)
  })

  it('maps memory ids as il-store-{code}', () => {
    expect(israelStoreId('172')).toBe('il-store-172')
    const rows = israelStoresAsRows()
    expect(rows).toHaveLength(48)
    expect(rows.every((r) => r.is_active && r.id.startsWith('il-store-'))).toBe(
      true,
    )
  })
})
