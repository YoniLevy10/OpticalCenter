import { beforeEach, describe, expect, it } from 'vitest'
import {
  actorCanOverrideResolve,
  isProofAttachmentKind,
  memoryTicketHasResolveProof,
  proofPairFromAttachments,
  RESOLVE_OVERRIDE_REASON_REQUIRED_HE,
  RESOLVE_PROOF_REQUIRED_HE,
} from '@/modules/tickets/proof-gate'
import {
  memCreate,
  memAddMessage,
  memGet,
  memReset,
} from '@/lib/data/memory-store'
import { updateStatus } from '@/modules/tickets/service'
import { israelStoresAsRows } from '@/modules/stores/israel-stores'

process.env.MAINTAINOS_FORCE_MEMORY = '1'

const store = () => israelStoresAsRows().find((s) => s.code === '6018')!

function attachBeforeAfter(ticketId: string) {
  memAddMessage(ticketId, {
    channel: 'tech',
    direction: 'inbound',
    body: 'before',
    media_url: 'https://cdn.example/before.jpg',
    proof_role: 'before',
  })
  memAddMessage(ticketId, {
    channel: 'tech',
    direction: 'inbound',
    body: 'after',
    media_url: 'https://cdn.example/after.jpg',
    proof_role: 'after',
  })
}

describe('proof gate helpers', () => {
  it('accepts image, video, before, after as proof kinds', () => {
    expect(isProofAttachmentKind('image')).toBe(true)
    expect(isProofAttachmentKind('video')).toBe(true)
    expect(isProofAttachmentKind('before')).toBe(true)
    expect(isProofAttachmentKind('after')).toBe(true)
    expect(isProofAttachmentKind('audio')).toBe(false)
    expect(isProofAttachmentKind('document')).toBe(false)
  })

  it('requires before+after pair', () => {
    expect(
      proofPairFromAttachments([{ kind: 'image', proof_role: 'before' }]).complete,
    ).toBe(false)
    expect(
      proofPairFromAttachments([
        { kind: 'image', proof_role: 'before' },
        { kind: 'image', proof_role: 'after' },
      ]).complete,
    ).toBe(true)
  })

  it('allows only global_maintenance to override', () => {
    expect(actorCanOverrideResolve(['global_admin'])).toBe(false)
    expect(actorCanOverrideResolve(['global_maintenance'])).toBe(true)
    expect(actorCanOverrideResolve(['country_manager', 'global_maintenance'])).toBe(
      true,
    )
  })

  it('treats paired message media as memory proof', () => {
    expect(
      memoryTicketHasResolveProof([
        { media_url: 'https://cdn.example/proof.jpg', channel: 'tech' },
      ]),
    ).toBe(false)
    expect(
      memoryTicketHasResolveProof([
        {
          media_url: 'https://cdn.example/before.jpg',
          channel: 'tech',
          proof_role: 'before',
        },
        {
          media_url: 'https://cdn.example/after.jpg',
          channel: 'tech',
          proof_role: 'after',
        },
      ]),
    ).toBe(true)
  })
})

describe('updateStatus resolve proof gate (memory)', () => {
  beforeEach(() => {
    process.env.MAINTAINOS_FORCE_MEMORY = '1'
    memReset()
  })

  it('blocks resolve without before/after proof', async () => {
    const ticket = memCreate({
      store: store(),
      description: 'בדיקת הוכחה',
      category: 'hvac',
      priority: 'medium',
      source: 'demo',
      status: 'in_progress',
    })
    await expect(
      updateStatus(ticket.id, 'resolved', 'hq-1', {
        actorRoles: ['global_admin'],
      }),
    ).rejects.toThrow(RESOLVE_PROOF_REQUIRED_HE)
  })

  it('blocks resolve with only one side of the pair', async () => {
    const ticket = memCreate({
      store: store(),
      description: 'רק לפני',
      category: 'hvac',
      priority: 'medium',
      source: 'demo',
      status: 'in_progress',
    })
    memAddMessage(ticket.id, {
      channel: 'tech',
      direction: 'inbound',
      body: 'before',
      media_url: 'https://cdn.example/before.jpg',
      proof_role: 'before',
    })
    await expect(
      updateStatus(ticket.id, 'resolved', 'tech-1', {
        actorRoles: ['internal_technician'],
      }),
    ).rejects.toThrow(RESOLVE_PROOF_REQUIRED_HE)
  })

  it('allows Ari override with reason and audits', async () => {
    const ticket = memCreate({
      store: store(),
      description: 'בדיקת חריגה',
      category: 'hvac',
      priority: 'high',
      source: 'demo',
      status: 'in_progress',
    })
    const updated = await updateStatus(ticket.id, 'resolved', 'ari-1', {
      actorRoles: ['global_maintenance'],
      overrideReason: 'טופל מרחוק — אין גישה לצילום',
    })
    expect(updated.status).toBe('resolved')
    const events = memGet(ticket.id)?.events ?? []
    expect(events.some((e) => e.event_type === 'resolve_override')).toBe(true)
  })

  it('requires override reason for Ari without proof', async () => {
    const ticket = memCreate({
      store: store(),
      description: 'בלי סיבה',
      category: 'other',
      priority: 'low',
      source: 'demo',
      status: 'assigned',
    })
    await expect(
      updateStatus(ticket.id, 'resolved', 'ari-1', {
        actorRoles: ['global_maintenance'],
      }),
    ).rejects.toThrow(RESOLVE_OVERRIDE_REASON_REQUIRED_HE)
  })

  it('allows resolve when before and after proof are attached', async () => {
    const ticket = memCreate({
      store: store(),
      description: 'עם תמונות',
      category: 'plumbing',
      priority: 'medium',
      source: 'demo',
      status: 'in_progress',
    })
    attachBeforeAfter(ticket.id)
    const updated = await updateStatus(ticket.id, 'resolved', 'tech-1', {
      actorRoles: ['internal_technician'],
    })
    expect(updated.status).toBe('resolved')
    expect(updated.quality_hold_until).toBeTruthy()
  })
})
