import { describe, expect, it, beforeEach } from 'vitest'
import {
  canExecuteSpend,
  decideSpend,
  invoiceVariance,
  withCommercialChange,
  type SpendRequest,
} from '@/modules/spend/policy'
import { proposeSyncedValue, relabelStoreCode, linkContactToStore } from '@/modules/stores/directory-rules'
import { findRecurrences, suggestPrevention } from '@/modules/tickets/recurrence'
import { runIngestPipeline, markSourceDeleted } from '@/modules/ingestion/pipeline'
import { splitVoiceTranscript } from '@/modules/tasks/voice-split'
import { applyMovement, availableQuantity, canRequestPurchase } from '@/modules/inventory/stock'
import { rankKnownVendors } from '@/modules/vendors/outcomes'
import { computePilotMetrics } from '@/modules/pilot/metrics'
import { isStatusQuestion, statusReply } from '@/modules/whatsapp/intent'
import { buildDailyDigest } from '@/modules/digest/daily'
import { renewDocument } from '@/modules/documents/rules'
import {
  AYA_PHONE,
  ARI_PHONE,
  TEST_DESK_PHONE,
  listContacts,
  proposeContactPhone,
  resetOpsLedger,
} from '@/lib/data/ops-ledger'

function spend(partial: Partial<SpendRequest> = {}): SpendRequest {
  return {
    id: 's1',
    storeId: 'store',
    storeCode: '172',
    storeName: 'אבן גבירול',
    ticketId: 't1',
    reason: 'מזגן',
    vendorName: 'קירור',
    requestedAmount: 1000,
    approvedAmount: 1000,
    actualAmount: null,
    scope: 'תיקון',
    status: 'approved',
    urgent: false,
    requestedBy: 'סניף',
    decidedBy: 'ארי',
    decidedAt: '2026-10-01T00:00:00.000Z',
    needsReapproval: false,
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
    ...partial,
  }
}

describe('Ari control center', () => {
  beforeEach(() => resetOpsLedger())

  it('blocks execution until Ari approves, and again after a commercial change', () => {
    const pending = spend({ status: 'pending', approvedAmount: null })
    expect(canExecuteSpend(pending)).toBe(false)
    const approved = decideSpend(pending, 'approved', 'ארי')
    expect(canExecuteSpend(approved)).toBe(true)
    const revised = withCommercialChange(approved, { requestedAmount: 1800 })
    expect(revised.status).toBe('pending')
    expect(canExecuteSpend(revised)).toBe(false)
  })

  it('flags an invoice above the approved amount', () => {
    expect(invoiceVariance(spend({ actualAmount: 1200 }))).toBe(true)
    expect(invoiceVariance(spend({ actualAmount: 900 }))).toBe(false)
  })

  it('keeps Ari on 0509881951 and Aya unverified', () => {
    const ari = listContacts().find((contact) => contact.fullName === 'ארי')
    expect(ari?.phone.replace(/\D/g, '')).toBe(ARI_PHONE)
    const aya = listContacts().find((contact) => contact.id === 'contact-aya-6018')
    expect(aya?.phoneStatus).toBe('needs_verification')
    const desk = listContacts().find((contact) => contact.id === 'contact-test-desk')
    expect(desk?.phone).toBe(TEST_DESK_PHONE)
    expect(desk?.roleLabel).toBe('מנהל מערכת')
    expect(desk?.storeIds).toEqual([])
  })

  it('keeps Aya’s phone text and opens a conflict instead of auto-correcting', () => {
    const proposal = proposeContactPhone('contact-aya-6018', '0502284020', 'sync')
    expect(proposal.action).toBe('conflict')
    if (proposal.action === 'conflict') expect(proposal.current).toBe(AYA_PHONE)
  })

  it('keeps store links when a contact is shared and when a code changes', () => {
    const contact = linkContactToStore(
      { contactId: 'c', fullName: 'איה', phone: AYA_PHONE, storeIds: ['a'] },
      'b',
    )
    expect(contact.storeIds).toEqual(['a', 'b'])
    const renamed = relabelStoreCode(
      { id: 'store-1', code: '118' },
      '6045',
      [{ id: 'store-2', code: '172' }],
    )
    expect(renamed.id).toBe('store-1')
    expect(renamed.code).toBe('6045')
  })

  it('does not let a sync overwrite a manual lock', () => {
    const locked = proposeSyncedValue({
      field: 'name',
      current: 'כפר סבא 1 עתיר',
      incoming: 'כפר סבא',
      locked: true,
      needsVerification: false,
    })
    expect(locked.action).toBe('conflict')
  })

  it('finds repeats in the same store and category', () => {
    const current = {
      id: 'new',
      storeId: 's',
      category: 'hvac',
      assetId: 'ac',
      description: 'מזגן',
      status: 'new',
      createdAt: '2026-10-01T00:00:00.000Z',
    }
    const hits = findRecurrences(current, [
      { ...current, id: 'old', createdAt: '2026-08-01T00:00:00.000Z' },
      { ...current, id: 'other', storeId: 'elsewhere', createdAt: '2026-08-01T00:00:00.000Z' },
    ])
    expect(hits).toHaveLength(1)
    expect(suggestPrevention([...hits, ...hits, ...hits])).toMatch(/בדיקה מונעת/)
  })

  it('sends an unclear file to review and keeps history when Drive deletes it', () => {
    const file = runIngestPipeline({
      id: 'f',
      name: 'scan.pdf',
      mime: 'application/pdf',
      knownStoreCodes: ['172'],
      existingNames: [],
    })
    expect(file.status).toBe('needs_review')
    expect(markSourceDeleted(file).deletedInSource).toBe(true)
  })

  it('splits one recording into tasks and treats money as an approval', () => {
    const tasks = splitVoiceTranscript('לבדוק מזגן בסניף 172 עד מחר וגם לשלם ₪400 לספק')
    expect(tasks.length).toBeGreaterThan(1)
    expect(tasks.some((task) => task.financial)).toBe(true)
  })

  it('shows stock before a purchase and ranks a known vendor first', () => {
    const rows = applyMovement([], {
      id: 'm',
      itemId: 'filter',
      fromLocationId: null,
      toLocationId: 'warehouse',
      quantity: 2,
      ticketId: null,
      kind: 'in',
    })
    expect(availableQuantity(rows, 'filter', 'warehouse')).toBe(2)
    expect(canRequestPurchase(2, 3)).toBe(true)
    const ranked = rankKnownVendors(
      [
        {
          vendorId: 'a',
          vendorName: 'מוכר',
          category: 'hvac',
          region: 'N',
          price: 100,
          arrivalMinutes: 40,
          quality: 5,
          warrantyNote: 'שנה',
          success: true,
        },
      ],
      'hvac',
      'N',
    )
    expect(ranked[0]?.vendorName).toBe('מוכר')
  })

  it('answers a status question without calling a received request approved', () => {
    expect(isStatusQuestion('מה המצב של הפנייה?')).toBe(true)
    expect(statusReply([{ displayNumber: 'OC-1', status: 'new', spendApproved: false }])).toMatch(
      /עדיין לא אושרה/,
    )
  })

  it('builds one daily headline and closes a renewal only with a new file', () => {
    const digest = buildDailyDigest({
      decisions: [
        {
          id: '1',
          kind: 'spend',
          title: 'אישור',
          storeCode: '172',
          storeName: 'א',
          owner: 'ארי',
          urgency: 'today',
          action: 'לאשר',
          href: '/ops/approvals',
        },
      ],
      openTasks: 2,
    })
    expect(digest.headline).toMatch(/אישורים/)
    const doc = {
      id: 'd',
      storeId: 's',
      storeCode: '172',
      storeName: 'א',
      docType: 'fire',
      sourceUrl: 'old',
      extractedExpiry: '2020-01-01T00:00:00.000Z',
      computedNextCheck: null,
      owner: 'ארי',
      intakeStatus: 'ingested' as const,
      intakeReason: null,
      version: 1,
      previousId: null,
      renewed: false,
      createdAt: '2020-01-01T00:00:00.000Z',
    }
    expect(() => renewDocument(doc, { sourceUrl: '', extractedExpiry: null })).toThrow(/מסמך/)
    const renewed = renewDocument(doc, {
      sourceUrl: 'https://drive/new',
      extractedExpiry: '2027-01-01T00:00:00.000Z',
    })
    expect(renewed.closed.renewed).toBe(true)
    expect(renewed.next.previousId).toBe('d')
  })

  it('measures pilot timing', () => {
    const metrics = computePilotMetrics([
      {
        openedAt: '2026-10-01T00:00:00.000Z',
        resolvedAt: '2026-10-01T04:00:00.000Z',
        approvalRequestedAt: '2026-10-01T01:00:00.000Z',
        approvalDecidedAt: '2026-10-01T02:00:00.000Z',
        reachedAriOutsideSystem: true,
        repeatedFault: true,
        ingestedClean: true,
        correctedManually: false,
      },
    ])
    expect(metrics.medianResolveHours).toBe(4)
    expect(metrics.medianApprovalHours).toBe(1)
    expect(metrics.outsideSystem).toBe(1)
    expect(metrics.cleanIngestRate).toBe(1)
  })
})
