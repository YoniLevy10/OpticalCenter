import { describe, expect, it } from 'vitest'
import type { BundleCard } from '@/modules/whatsapp/agent/bundle'
import type { StoreDocument } from '@/modules/documents/rules'
import {
  answerFromSnapshot,
  duePapersFrom,
  repeatGearFrom,
  type GearAsset,
  type GearTicket,
  type OpsSnapshot,
} from './agent-chat'

function card(partial: Partial<BundleCard>): BundleCard {
  return {
    id: 'bundle:1',
    kind: 'bundle',
    storeId: 's1',
    storeName: 'דיזנגוף',
    category: 'plumbing',
    ticketIds: ['a', 'b'],
    sentence: '2 נזילות בסניף דיזנגוף. אנדי יכול לטפל בכולן בביקור אחד.',
    costLine: 'אין עדיין מחיר',
    professionalName: 'אנדי',
    professionalId: 'p1',
    professionalSource: 'book',
    ...partial,
  }
}

const snapshot: OpsSnapshot = {
  open: [
    {
      id: 'a',
      storeName: 'דיזנגוף',
      category: 'plumbing',
      summary: 'ברז בשירותים',
      displayNumber: 'OC-12',
    },
    {
      id: 'b',
      storeName: 'דיזנגוף',
      category: 'plumbing',
      summary: 'כיור במטבח',
      displayNumber: 'OC-13',
    },
    {
      id: 'c',
      storeName: 'חיפה',
      category: 'hvac',
      summary: 'המזגן לא מקרר',
      displayNumber: 'OC-14',
    },
  ],
  cards: [card({})],
}

describe('answerFromSnapshot', () => {
  it('quotes the bundle it actually computed', () => {
    const reply = answerFromSnapshot('מה כדאי לאחד?', snapshot)
    expect(reply).toContain('2 נזילות')
    expect(reply).toContain('אנדי')
  })

  it('lists the faults of a named store', () => {
    const reply = answerFromSnapshot('מה פתוח בדיזנגוף?', snapshot)
    expect(reply).toContain('OC-12')
    expect(reply).toContain('ברז')
    expect(reply).not.toContain('המזגן')
  })

  it('names the store that actually needs him when the question names another', () => {
    const reply = answerFromSnapshot('מה קורה באילת?', snapshot)
    expect(reply).toContain('דיזנגוף')
    expect(reply).not.toContain('אילת')
  })

  it('answers the worst store and then stays on it', () => {
    const live: OpsSnapshot = {
      ...snapshot,
      open: snapshot.open.map((fault) =>
        fault.id === 'c' ? { ...fault, overdue: true, verb: 'לשייך', assigned: false } : fault,
      ),
    }
    const first = answerFromSnapshot('איזה סניף הכי דחוף?', live)
    expect(first).toContain('חיפה')
    expect(first).toContain('המזגן')
    const more = answerFromSnapshot('תיתן לי קצת יותר מידע', live, 'he', [
      { role: 'assistant', text: first },
    ])
    expect(more).toContain('חיפה')
    expect(more).toContain('המזגן')
    expect(more).not.toContain('בדשבורד')
  })

  it('says the floor is quiet when nothing is open', () => {
    expect(answerFromSnapshot('מה המצב?', { open: [], cards: [] })).toBe(
      'אין תקלות פתוחות. הכל שקט.',
    )
  })

  it('answers the same facts in English', () => {
    const reply = answerFromSnapshot("What's open?", snapshot, 'en')
    expect(reply).toContain('3 open')
    expect(reply).toContain('leaks')
    expect(reply).toContain('אנדי')
  })

  it('gives a range only from recorded prices of that fault type', () => {
    const reply = answerFromSnapshot('מה טווח המחיר למיזוג?', {
      ...snapshot,
      bands: [
        { category: 'hvac', low: 2400, high: 4100 },
        { category: 'electrical', low: 1800, high: 1800 },
      ],
    })
    expect(reply).toContain('₪2,400–₪4,100')
    expect(reply).not.toContain('₪1,800')
    expect(reply).not.toContain('כ־')
  })

  it('says there is no range when nothing was recorded', () => {
    expect(answerFromSnapshot('כמה זה יעלה?', snapshot)).toContain('אין טווח')
  })

  it('answers a bundle question in French', () => {
    const reply = answerFromSnapshot('Que faut-il regrouper ?', snapshot, 'fr')
    expect(reply).toContain('fuites')
    expect(reply).toContain('אנדי')
    expect(reply).toContain('visite')
  })

  it('names an overdue document even when nothing is open', () => {
    const reply = answerFromSnapshot('מה המצב?', {
      open: [],
      cards: [],
      papers: [{ storeName: 'דיזנגוף', label: 'כיבוי אש', overdue: true }],
    })
    expect(reply).toContain('כיבוי אש')
    expect(reply).toContain('באיחור')
    expect(reply).not.toContain('הכל שקט')
  })

  it('names repeating equipment and a price only when one was recorded', () => {
    const priced = answerFromSnapshot('איזה ציוד חוזר?', {
      open: [],
      cards: [],
      gear: [
        {
          storeName: 'חיפה',
          name: 'מזגן מרכזי',
          times: 3,
          openSummary: 'לא מקרר',
          cost: 2400,
        },
      ],
    })
    expect(priced).toContain('מזגן מרכזי')
    expect(priced).toContain('3')
    expect(priced).toContain('₪2,400')
    const bare = answerFromSnapshot('איזה ציוד חוזר?', {
      open: [],
      cards: [],
      gear: [
        {
          storeName: 'חיפה',
          name: 'מזגן מרכזי',
          times: 3,
          openSummary: 'לא מקרר',
          cost: null,
        },
      ],
    })
    expect(bare).toContain('מזגן מרכזי')
    expect(bare).not.toContain('₪')
  })

  it('adds the store document when he asks about that store', () => {
    const reply = answerFromSnapshot('מה פתוח בדיזנגוף?', {
      ...snapshot,
      papers: [{ storeName: 'דיזנגוף', label: 'טימפנומטר', overdue: false }],
    })
    expect(reply).toContain('טימפנומטר')
    expect(reply).toContain('פחות מחודש')
    expect(reply).not.toContain('המזגן')
  })
})

const NOW = new Date('2026-11-01T00:00:00.000Z')

function paper(partial: Partial<StoreDocument>): StoreDocument {
  return {
    id: 'd1',
    storeId: 's1',
    storeCode: '1',
    storeName: 'דיזנגוף',
    docType: 'fire',
    sourceUrl: null,
    extractedExpiry: '2026-10-01T00:00:00.000Z',
    computedNextCheck: null,
    owner: null,
    intakeStatus: 'ingested',
    intakeReason: null,
    version: 1,
    previousId: null,
    renewed: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...partial,
  }
}

describe('duePapersFrom', () => {
  it('keeps overdue and month-ahead documents, and drops the rest', () => {
    const rows = duePapersFrom(
      [
        paper({}),
        paper({
          id: 'd2',
          storeName: 'חיפה',
          docType: 'hearing_a',
          extractedExpiry: '2026-11-20T00:00:00.000Z',
        }),
        paper({ id: 'd3', extractedExpiry: '2027-06-01T00:00:00.000Z' }),
        paper({ id: 'd4', renewed: true }),
      ],
      NOW,
    )
    expect(rows.map((row) => row.label)).toEqual(['כיבוי אש', 'טימפנומטר'])
    expect(rows[0]?.overdue).toBe(true)
    expect(rows[1]?.overdue).toBe(false)
  })
})

const asset: GearAsset = {
  id: 'asset-1',
  name: 'מזגן מרכזי',
  storeId: 's1',
  storeName: 'דיזנגוף',
}

function fault(partial: Partial<GearTicket>): GearTicket {
  return {
    id: 't1',
    assetId: 'asset-1',
    storeId: 's1',
    storeName: 'דיזנגוף',
    summary: 'המזגן לא מקרר',
    createdAt: '2026-10-01T00:00:00.000Z',
    status: 'resolved',
    ...partial,
  }
}

describe('repeatGearFrom', () => {
  it('counts two faults on the same asset and keeps a recorded price', () => {
    const rows = repeatGearFrom(
      [asset],
      [fault({ id: 't1' }), fault({ id: 't2', status: 'new', summary: 'שוב לא מקרר' })],
      { 'asset-1': 1800 },
      NOW,
    )
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ times: 2, cost: 1800, openSummary: 'שוב לא מקרר' })
  })

  it('links a report that names the asset, and stays silent without a price', () => {
    const rows = repeatGearFrom(
      [asset],
      [
        fault({ id: 't1' }),
        fault({ id: 't2', assetId: null, summary: 'המזגן מרכזי נוזל' }),
      ],
      {},
      NOW,
    )
    expect(rows[0]?.times).toBe(2)
    expect(rows[0]?.cost).toBeNull()
  })

  it('ignores a single fault and a cancelled one', () => {
    expect(repeatGearFrom([asset], [fault({ id: 'only' })], {}, NOW)).toEqual([])
    expect(
      repeatGearFrom(
        [asset],
        [fault({ id: 't1' }), fault({ id: 't2', status: 'cancelled' })],
        { 'asset-1': 500 },
        NOW,
      ),
    ).toEqual([])
  })
})
