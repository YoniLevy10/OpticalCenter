import { beforeEach, describe, expect, it } from 'vitest'
import {
  canCorrectTicketClassification,
  explainClassification,
  mergeAiRawAfterManualCorrection,
  buildAiRawFromIntake,
} from '@/modules/tickets/classification-explain'
import { applyIntakeRules } from '@/modules/whatsapp/agent/rules'
import {
  correctClassification,
  updatePriority,
} from '@/modules/tickets/service'
import {
  recomputeSlaOnPriorityChange,
  computeSlaTimestamps,
  getSlaBreachKind,
  SLA_WINDOWS,
} from '@/modules/tickets/sla'
import {
  memCreate,
  memGet,
  memReset,
} from '@/lib/data/memory-store'
import { israelStoresAsRows } from '@/modules/stores/israel-stores'
import { listClassificationCorrections } from '@/lib/data/ops-ledger'
import type { Actor } from '@/lib/auth/types'

process.env.MAINTAINOS_FORCE_MEMORY = '1'

const store = () => israelStoresAsRows().find((s) => s.code === '6018')!

function hqActor(): Actor {
  return {
    id: 'hq-1',
    email: 'ari@demo.local',
    full_name: 'ארי',
    authVia: 'test_bearer',
    memberships: [
      {
        id: 'm1',
        profile_id: 'hq-1',
        role: 'global_maintenance',
        organization_id: 'org',
        country_id: null,
        region_id: null,
        store_id: null,
      },
    ],
  }
}

function techActor(): Actor {
  return {
    id: 'tech-1',
    email: 'tech@demo.local',
    full_name: 'טכנאי',
    authVia: 'test_bearer',
    memberships: [
      {
        id: 'm2',
        profile_id: 'tech-1',
        role: 'internal_technician',
        organization_id: 'org',
        country_id: null,
        region_id: null,
        store_id: null,
      },
    ],
  }
}

describe('C06 classification explain', () => {
  beforeEach(() => {
    memReset()
  })

  it('rules-only: source=rules, short explanation, no confidence', () => {
    const rules = applyIntakeRules({
      text: 'ריח שרוף מהשקע בלוח החשמל',
    })
    const aiRaw = buildAiRawFromIntake({
      provider: 'rules',
      rules,
      ai: null,
      original: 'ריח שרוף מהשקע בלוח החשמל',
    })
    const view = explainClassification({
      category: rules.category,
      priority: rules.priority,
      aiRaw,
    })
    expect(view.source).toBe('rules')
    expect(view.sourceLabelHe).toBe('כללים')
    expect(view.explanationHe).toMatch(/כללים|סכנת בטיחות|חשמל/)
    expect(view.explanationHe).not.toMatch(/%|confidence|ביטחון/)
    expect(JSON.stringify(view)).not.toMatch(/confidence/i)
    expect(view.modelFailed).toBe(false)
  })

  it('model fail: provider=none → rules source + needs review', () => {
    const rules = applyIntakeRules({
      text: 'המזגן הראשי לא עובד ויש ממנו נזילה',
    })
    const aiRaw = buildAiRawFromIntake({
      provider: 'none',
      rules,
      ai: null,
      original: 'המזגן הראשי לא עובד ויש ממנו נזילה',
    })
    const view = explainClassification({
      category: rules.category,
      priority: rules.priority,
      aiRaw,
    })
    expect(view.source).toBe('rules')
    expect(view.modelFailed).toBe(true)
    expect(view.needsReview.some((r) => /מודל/.test(r))).toBe(true)
    expect(view.explanationHe).not.toMatch(/\d+\s*%/)
  })

  it('manual correction writes before/after audit and source=manual', async () => {
    const createdAt = '2026-01-01T08:00:00.000Z'
    const ticket = memCreate({
      store: store(),
      description: 'קופה לא מתחברת',
      priority: 'low',
      category: 'it',
      createdAt,
      ai_raw: buildAiRawFromIntake({
        provider: 'rules',
        rules: applyIntakeRules({ text: 'קופה לא מתחברת' }),
      }),
    })

    await correctClassification(ticket.id, {
      category: 'electrical',
      priority: 'high',
      reason: 'נראה קצר חשמלי ליד הקופה',
      actorId: 'hq-1',
    })

    const after = memGet(ticket.id)!
    expect(after.category).toBe('electrical')
    expect(after.priority).toBe('high')
    expect(after.ai_raw?.source).toBe('manual')

    const view = explainClassification({
      category: after.category,
      priority: String(after.priority),
      aiRaw: after.ai_raw,
    })
    expect(view.source).toBe('manual')
    expect(view.corrected?.fromCategory).toBe('it')
    expect(view.corrected?.fromPriority).toBe('low')
    expect(view.corrected?.toCategory).toBe('electrical')
    expect(view.corrected?.toPriority).toBe('high')
    expect(view.explanationHe).toMatch(/ידנית/)

    const event = after.events.find((e) => e.event_type === 'classification_corrected')
    expect(event).toBeTruthy()
    expect(event?.payload).toMatchObject({
      from: { category: 'it', priority: 'low' },
      to: { category: 'electrical', priority: 'high' },
      reason: 'נראה קצר חשמלי ליד הקופה',
    })
  })

  it('missing permission: tech cannot correct', () => {
    expect(canCorrectTicketClassification(techActor(), false)).toBe(false)
    expect(canCorrectTicketClassification(null, false)).toBe(false)
    expect(canCorrectTicketClassification(hqActor(), false)).toBe(true)
    expect(canCorrectTicketClassification(null, true)).toBe(true)
  })

  it('SLA priority change anchors to created_at — does not reset overdue to now', async () => {
    const createdAt = new Date(Date.now() - 10 * 3600_000).toISOString()
    const initial = computeSlaTimestamps('critical', new Date(createdAt))
    const ticket = memCreate({
      store: store(),
      description: 'ריח שרוף',
      priority: 'critical',
      category: 'electrical',
      createdAt,
      sla_respond_by: initial.sla_respond_by,
      sla_resolve_by: initial.sla_resolve_by,
    })

    expect(
      getSlaBreachKind({
        status: 'new',
        sla_respond_by: ticket.sla_respond_by,
        sla_resolve_by: ticket.sla_resolve_by,
      }),
    ).not.toBe('none')

    await updatePriority(ticket.id, 'high')
    const updated = memGet(ticket.id)!
    const expected = recomputeSlaOnPriorityChange({
      priority: 'high',
      createdAt,
    })
    expect(updated.sla_respond_by).toBe(expected.sla_respond_by)
    expect(updated.sla_resolve_by).toBe(expected.sla_resolve_by)

    // Must not equal "from now" windows (would wipe overdue incorrectly)
    const fromNow = computeSlaTimestamps('high', new Date())
    expect(updated.sla_respond_by).not.toBe(fromNow.sla_respond_by)
    expect(updated.sla_resolve_by).not.toBe(fromNow.sla_resolve_by)

    // Still overdue relative to created_at (high window 2h/8h vs 10h open)
    expect(
      getSlaBreachKind({
        status: 'new',
        sla_respond_by: updated.sla_respond_by,
        sla_resolve_by: updated.sla_resolve_by,
      }),
    ).not.toBe('none')
    expect(new Date(updated.sla_respond_by!).getTime()).toBeLessThan(Date.now())
    expect(SLA_WINDOWS.high.respondHours).toBe(2)
  })

  it('mergeAiRawAfterManualCorrection preserves prior rules blob', () => {
    const rules = applyIntakeRules({ text: 'נזילה מהמזגן' })
    const prev = buildAiRawFromIntake({
      provider: 'gateway',
      rules,
      ai: {
        summary: 'נזילה מהמזגן',
        category: 'hvac',
        priority_suggestion: 'medium',
        needs_clarification: false,
      },
    })
    const next = mergeAiRawAfterManualCorrection(prev, {
      fromCategory: 'hvac',
      fromPriority: 'high',
      toCategory: 'plumbing',
      toPriority: 'medium',
      reason: 'בעיקר אינסטלציה',
    })
    expect(next.source).toBe('manual')
    expect(next.rules).toEqual(rules)
    expect((next.corrected as { reason: string }).reason).toBe('בעיקר אינסטלציה')
  })
})

describe('C06 ledger correction helper', () => {
  it('records detail fields', async () => {
    const { recordClassificationCorrection } = await import(
      '@/lib/data/ops-ledger'
    )
    const before = listClassificationCorrections().length
    recordClassificationCorrection('t1', 'low', 'high', {
      fromCategory: 'it',
      toCategory: 'electrical',
      fromPriority: 'low',
      toPriority: 'high',
      reason: 'בדיקה',
    })
    const rows = listClassificationCorrections()
    expect(rows.length).toBe(before + 1)
    expect(rows.at(-1)).toMatchObject({
      ticketId: 't1',
      fromCategory: 'it',
      toCategory: 'electrical',
      reason: 'בדיקה',
    })
  })
})
