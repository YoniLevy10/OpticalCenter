import { describe, expect, it } from 'vitest'
import { ARI_PHONE, TEST_DESK_PHONE } from '@/lib/data/ops-ledger'
import { ISRAEL_STORES } from '@/modules/stores/israel-stores'
import { planManagerPhones as planManagerPhonesUntyped } from '../../../scripts/manager-phone-plan.mjs'

type PlanRow = {
  storeCode: string
  waId: string | null
  action: 'link' | 'skip'
  reason: string
}

const planManagerPhones = planManagerPhonesUntyped as (input: {
  stores: { storeCode: string; managerName: string; phone: string }[]
  blockedPhones: string[]
  existing: { waId: string; storeCode: string }[]
}) => PlanRow[]

describe('planManagerPhones', () => {
  it('skips blank, desk, duplicate, and foreign mappings', () => {
    const plan = planManagerPhones({
      blockedPhones: [ARI_PHONE, TEST_DESK_PHONE],
      existing: [{ waId: '972503333333', storeCode: '6001' }],
      stores: [
        { storeCode: '6001', managerName: 'א', phone: '' },
        { storeCode: '6009', managerName: 'ארי', phone: ARI_PHONE },
        { storeCode: '6010', managerName: 'ב', phone: '050-1111111' },
        { storeCode: '6011', managerName: 'ג', phone: '050-1111111' },
        { storeCode: '6012', managerName: 'ד', phone: '050-2222222' },
        { storeCode: '6013', managerName: 'ה', phone: '050-3333333' },
      ],
    })
    expect(plan.find((row) => row.storeCode === '6001')?.reason).toBe('empty')
    expect(plan.find((row) => row.storeCode === '6009')?.reason).toBe('desk')
    expect(plan.find((row) => row.storeCode === '6010')?.reason).toBe('duplicate')
    expect(plan.find((row) => row.storeCode === '6011')?.reason).toBe('duplicate')
    expect(plan.find((row) => row.storeCode === '6012')).toMatchObject({
      action: 'link',
      waId: '972502222222',
    })
    expect(plan.find((row) => row.storeCode === '6013')?.reason).toBe('mapped_elsewhere')
  })

  it('does not remap a phone that already belongs to the same store', () => {
    const plan = planManagerPhones({
      blockedPhones: [],
      existing: [{ waId: '972502222222', storeCode: '6012' }],
      stores: [{ storeCode: '6012', managerName: 'ד', phone: '050-2222222' }],
    })
    expect(plan[0]?.reason).toBe('already_linked')
    expect(plan[0]?.action).toBe('skip')
  })

  it('keeps desk phones out of the Israel catalog plan', () => {
    const plan = planManagerPhones({
      blockedPhones: [ARI_PHONE, TEST_DESK_PHONE],
      existing: [],
      stores: ISRAEL_STORES.map((store) => ({
        storeCode: store.code,
        managerName: store.managerName,
        phone: store.managerPhone,
      })),
    })
    const links = plan.filter((row) => row.action === 'link')
    const waIds = links.map((row) => row.waId)
    expect(new Set(waIds).size).toBe(waIds.length)
    expect(waIds).not.toContain('972509881951')
    expect(waIds).not.toContain('972548102688')
    expect(links.length).toBeGreaterThan(0)
  })
})
