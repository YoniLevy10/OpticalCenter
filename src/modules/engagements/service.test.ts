import { beforeEach, describe, expect, it } from 'vitest'
import { memCreate, memGet } from '@/lib/data/memory-store'
import { DEMO_STORES } from '@/modules/stores/data'
import { annualMaintenanceCost } from './cost'
import { parseEngagementApproval } from './parse'
import {
  cancelEngagement,
  lockEngagement,
  resetEngagementsForTests,
} from './service'

process.env.MAINTAINOS_FORCE_MEMORY = '1'

describe('parseEngagementApproval', () => {
  it('reads a price, a mobile number, and a name', () => {
    const parsed = parseEngagementApproval('אשר 450 0501234567 פבל')
    expect(parsed.amount).toBe(450)
    expect(parsed.phone).toContain('0501234567')
    expect(parsed.name).toBe('פבל')
  })

  it('does not treat a missing price as zero', () => {
    expect(parseEngagementApproval('לאשר').amount).toBeNull()
  })
})

describe('lockEngagement', () => {
  beforeEach(() => {
    process.env.MAINTAINOS_FORCE_MEMORY = '1'
    resetEngagementsForTests()
  })

  it('locks the price, moves the fault to the store, and writes the handoff', async () => {
    const store = DEMO_STORES[0]
    if (!store) throw new Error('missing demo store')
    const ticket = memCreate({
      store,
      description: 'המזגן לא מקרר',
      priority: 'high',
      category: 'hvac',
      reporterPhone: '0501111111',
    })
    const side = memCreate({
      store,
      description: 'ניקיון ויטרינה',
      priority: 'low',
      category: 'cleaning',
    })

    const locked = await lockEngagement({
      ticketId: ticket.id,
      bundledTicketIds: [side.id],
      professionalName: 'פבל',
      professionalPhone: '0501234567',
      approvedAmount: 450,
      approvedBy: 'ארי',
      midragSpId: '137520',
    })

    expect(locked.approvedAmount).toBe(450)
    expect(locked.status).toBe('locked')
    expect(memGet(ticket.id)?.status).toBe('engaged')
    expect(memGet(side.id)?.status).toBe('engaged')
    expect(memGet(ticket.id)?.messages.some((row) => row.body?.includes('ארי אישר'))).toBe(
      true,
    )
    await expect(
      lockEngagement({
        ticketId: ticket.id,
        professionalName: 'אחר',
        professionalPhone: '0501234567',
        approvedAmount: 900,
        approvedBy: 'ארי',
      }),
    ).rejects.toThrow(/נעול/)

    await cancelEngagement(ticket.id)
    expect(memGet(ticket.id)?.status).toBe('new')
    expect(memGet(side.id)?.status).toBe('new')
  })
})

describe('annualMaintenanceCost', () => {
  it('sums closed visits per store and for the network', () => {
    const report = annualMaintenanceCost(
      [
        {
          storeCode: '6004',
          storeName: 'שינקין',
          approvedAmount: 400,
          closedAt: '2026-03-01T00:00:00.000Z',
        },
        {
          storeCode: '6004',
          storeName: 'שינקין',
          approvedAmount: 150,
          closedAt: '2026-11-01T00:00:00.000Z',
        },
        {
          storeCode: '6014',
          storeName: 'אשקלון',
          approvedAmount: 200,
          closedAt: '2025-12-01T00:00:00.000Z',
        },
      ],
      2026,
    )
    expect(report.network).toBe(550)
    expect(report.stores[0]).toMatchObject({ storeCode: '6004', amount: 550 })
    expect(report.stores).toHaveLength(1)
  })
})
