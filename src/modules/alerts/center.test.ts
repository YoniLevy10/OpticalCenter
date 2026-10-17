import { describe, expect, it } from 'vitest'
import type { QueueTicket } from '@/modules/tickets/queue'
import type { DecisionItem } from '@/modules/decisions/queue'
import type { Actor, MemberRole } from '@/lib/auth/types'
import {
  buildOpenAlerts,
  canAccessAlertsCenter,
  composeAlertsCenter,
  filterAlerts,
  scopeAlertsForActor,
  type OpsAlert,
} from './center'

function ticket(
  partial: Partial<QueueTicket> & Pick<QueueTicket, 'id'>,
): QueueTicket {
  return {
    status: 'new',
    priority: 'medium',
    description: 'מזגן לא מקרר',
    created_at: '2026-10-01T10:00:00.000Z',
    updated_at: '2026-10-01T11:00:00.000Z',
    stores: { code: '6001', name: 'דיזנגוף' },
    ...partial,
  }
}

function actor(role: MemberRole): Actor {
  return {
    id: 'actor-1',
    authVia: 'test_bearer',
    memberships: [
      {
        id: 'm1',
        profile_id: 'actor-1',
        organization_id: 'org-1',
        role,
        country_id: 'il',
        region_id: null,
        store_id: role.includes('store') ? 'store-1' : null,
      },
    ],
  }
}

describe('buildOpenAlerts', () => {
  it('dedupes the same ticket from decisions + exception pass', () => {
    const now = new Date('2026-10-16T12:00:00.000Z')
    const t = ticket({
      id: 't1',
      status: 'new',
      assigned_to: null,
      sla_respond_by: '2026-10-16T08:00:00.000Z',
      priority: 'high',
    })
    const decision: DecisionItem = {
      id: 'ticket:t1',
      kind: 'ticket',
      title: t.description,
      storeCode: '6001',
      storeName: 'דיזנגוף',
      owner: 'לא משויך',
      urgency: 'overdue',
      action: 'לשייך · חדשה',
      href: '/ops/tickets/t1',
      ticketId: 't1',
    }

    const alerts = buildOpenAlerts({
      tickets: [t],
      decisions: [decision],
      now,
    })

    expect(alerts).toHaveLength(1)
    expect(alerts[0]?.id).toBe('ticket:t1')
    expect(alerts[0]?.reasons).toEqual(
      expect.arrayContaining(['חריגת SLA', 'לא משויך', 'דחיפות גבוהה']),
    )
    expect(alerts[0]?.bucket).toBe('urgent_overdue')
    expect(alerts[0]?.href).toBe('/ops/tickets/t1')
    expect(alerts[0]?.nextAction).toBeTruthy()
    expect(alerts[0]?.owner).toBeTruthy()
    expect(alerts[0]?.at).toBeTruthy()
  })

  it('keeps spend and ticket as separate items', () => {
    const now = new Date('2026-10-16T12:00:00.000Z')
    const decisions: DecisionItem[] = [
      {
        id: 'ticket:t1',
        kind: 'ticket',
        title: 'תקלה',
        storeCode: '6001',
        storeName: 'דיזנגוף',
        owner: 'ארי',
        urgency: 'today',
        action: 'לטפל',
        href: '/ops/tickets/t1',
        ticketId: 't1',
      },
      {
        id: 'spend:s1',
        kind: 'spend',
        title: 'חלק מזגן',
        storeCode: '6001',
        storeName: 'דיזנגוף',
        owner: 'סניף',
        urgency: 'today',
        action: 'לאשר',
        href: '/ops/approvals',
        spendId: 's1',
      },
    ]
    const alerts = buildOpenAlerts({
      tickets: [ticket({ id: 't1', assigned_to: null })],
      decisions,
      now,
    })
    expect(alerts.map((a) => a.id).sort()).toEqual(['spend:s1', 'ticket:t1'])
  })

  it('drops resolved sources that no longer need attention', () => {
    const now = new Date('2026-10-16T12:00:00.000Z')
    const closed = ticket({
      id: 't-closed',
      status: 'closed',
      assigned_to: 'tech',
      priority: 'low',
    })
    const alerts = buildOpenAlerts({
      tickets: [closed],
      decisions: [],
      now,
    })
    expect(alerts).toHaveLength(0)
  })

  it('places store confirm in waiting bucket', () => {
    const alerts = buildOpenAlerts({
      tickets: [
        ticket({
          id: 't-res',
          status: 'resolved',
          assigned_to: 'tech',
        }),
      ],
      decisions: [],
      now: new Date('2026-10-16T12:00:00.000Z'),
    })
    expect(alerts).toHaveLength(1)
    expect(alerts[0]?.bucket).toBe('waiting')
    expect(alerts[0]?.source).toBe('store_confirm')
  })
})

describe('filterAlerts', () => {
  const sample: OpsAlert[] = [
    {
      id: 'ticket:a',
      source: 'ticket',
      title: 'מיזוג',
      reasons: ['חריגת SLA'],
      severity: 'high',
      owner: 'ארי',
      at: '2026-10-16T10:00:00.000Z',
      nextAction: 'לשייך',
      href: '/ops/tickets/a',
      bucket: 'urgent_overdue',
      storeCode: '6001',
      storeName: 'דיזנגוף',
      ticketId: 'a',
    },
    {
      id: 'spend:b',
      source: 'spend',
      title: 'חשבונית',
      reasons: ['לאשר'],
      severity: 'medium',
      owner: 'סניף',
      at: '2026-10-16T11:00:00.000Z',
      nextAction: 'לאשר',
      href: '/ops/approvals',
      bucket: 'needs_decision',
      storeCode: '6006',
      storeName: 'חיפה',
      spendId: 'b',
    },
  ]

  it('filters by bucket and store', () => {
    expect(filterAlerts(sample, { bucket: 'needs_decision' })).toHaveLength(1)
    expect(filterAlerts(sample, { storeCode: '6001' })[0]?.id).toBe('ticket:a')
  })
})

describe('permissions', () => {
  it('allows HQ and blocks store/tech roles', () => {
    expect(canAccessAlertsCenter(actor('global_admin'))).toBe(true)
    expect(canAccessAlertsCenter(actor('global_maintenance'))).toBe(true)
    expect(canAccessAlertsCenter(actor('country_manager'))).toBe(true)
    expect(canAccessAlertsCenter(actor('store_employee'))).toBe(false)
    expect(canAccessAlertsCenter(actor('internal_technician'))).toBe(false)
  })

  it('scopes open alerts empty for non-HQ', () => {
    const open: OpsAlert[] = [
      {
        id: 'ticket:a',
        source: 'ticket',
        title: 'x',
        reasons: ['y'],
        severity: 'high',
        owner: 'ארי',
        at: '2026-10-16T10:00:00.000Z',
        nextAction: 'לטפל',
        href: '/ops/tickets/a',
        bucket: 'urgent_overdue',
        storeCode: '6001',
        storeName: 'דיזנגוף',
      },
    ]
    expect(scopeAlertsForActor(actor('global_admin'), open)).toHaveLength(1)
    expect(scopeAlertsForActor(actor('store_employee'), open)).toHaveLength(0)
  })
})

describe('composeAlertsCenter failed sources', () => {
  it('marks partialFailure and does not pretend all-clear when tickets fail', () => {
    const result = composeAlertsCenter({
      tickets: null,
      ticketsFailed: true,
      decisions: [
        {
          id: 'spend:s1',
          kind: 'spend',
          title: 'חלק',
          storeCode: '6001',
          storeName: 'דיזנגוף',
          owner: 'סניף',
          urgency: 'today',
          action: 'לאשר',
          href: '/ops/approvals',
          spendId: 's1',
        },
      ],
      ledgerFailed: false,
      history: [],
      historyFailed: false,
      actor: actor('global_admin'),
    })

    expect(result.partialFailure).toBe(true)
    expect(result.sources.tickets).toBe('failed')
    expect(result.open.some((a) => a.id === 'spend:s1')).toBe(true)
    // Empty open + failure would be wrong; here ledger still contributed.
    expect(result.open.length).toBeGreaterThan(0)
  })

  it('keeps partialFailure when every source fails even if open is empty', () => {
    const result = composeAlertsCenter({
      tickets: null,
      ticketsFailed: true,
      decisions: null,
      ledgerFailed: true,
      history: null,
      historyFailed: true,
      actor: actor('global_admin'),
    })
    expect(result.partialFailure).toBe(true)
    expect(result.open).toHaveLength(0)
    expect(result.sources).toEqual({
      tickets: 'failed',
      ledger: 'failed',
      history: 'failed',
    })
  })
})
