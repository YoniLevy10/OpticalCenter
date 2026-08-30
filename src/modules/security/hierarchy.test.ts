import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { createTicket } from '@/modules/tickets/service'
import {
  MEM_COUNTRY_FR_ID,
  MEM_COUNTRY_ID,
  memFindStoreByCodeInCountry,
} from '@/lib/data/memory-store'

process.env.MAINTAINOS_FORCE_MEMORY = '1'

describe('Hierarchy / data integrity', () => {
  const p0 = fs.readFileSync(
    path.join(
      process.cwd(),
      'supabase/migrations/20260815230000_p0_rls_hierarchy_france.sql',
    ),
    'utf8',
  )

  it('DB trigger enforce_ticket_hierarchy exists in migration', () => {
    expect(p0).toMatch(/enforce_ticket_hierarchy/)
    expect(p0).toMatch(/trg_tickets_hierarchy/)
    expect(p0).toMatch(/asset does not belong to ticket store/)
  })

  it('memory createTicket uses store country (IL 172)', async () => {
    process.env.MAINTAINOS_FORCE_MEMORY = '1'
    const t = await createTicket({
      storeCode: '172',
      description: 'hierarchy ok',
      source: 'demo',
    })
    expect(t.country_id).toBe(MEM_COUNTRY_ID)
    expect(t.store_id).toBe('il-store-172')
  })

  it('France store 172 is distinct from Israel 172', () => {
    const il = memFindStoreByCodeInCountry(MEM_COUNTRY_ID, '172')
    const fr = memFindStoreByCodeInCountry(MEM_COUNTRY_FR_ID, '172')
    expect(il?.id).toBe('il-store-172')
    expect(fr?.id).toBe('demo-fr-172')
    expect(il?.id).not.toBe(fr?.id)
  })

  it('rejects IL storeId with FR countryCode', async () => {
    process.env.MAINTAINOS_FORCE_MEMORY = '1'
    await expect(
      createTicket({
        storeId: 'il-store-172',
        countryCode: 'FR',
        description: 'cross hierarchy',
        source: 'demo',
      }),
    ).rejects.toThrow(/does not belong to the requested country/i)
  })

  it('creates France ticket when countryCode=FR and code 172', async () => {
    process.env.MAINTAINOS_FORCE_MEMORY = '1'
    const t = await createTicket({
      storeCode: '172',
      countryCode: 'FR',
      description: 'clim HS',
      source: 'demo',
    })
    expect(t.store_id).toBe('demo-fr-172')
    expect(t.country_id).toBe(MEM_COUNTRY_FR_ID)
  })
})
