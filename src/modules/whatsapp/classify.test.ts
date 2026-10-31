import { describe, expect, it } from 'vitest'
import { classifyInbound, splitSpokenFaults } from './classify'
import { isStatusQuestion } from './intent'

describe('inbound language routing', () => {
  it('keeps a French fault on the ticket path and sends a facture to money', () => {
    expect(classifyInbound({ text: "fuite d'eau dans le magasin", mediaKind: null })).toBe('fault')
    expect(classifyInbound({ text: 'facture 400€ pour le magasin', mediaKind: null })).toBe('money')
    expect(classifyInbound({ text: 'invoice for ₪400', mediaKind: null })).toBe('money')
  })

  it('splits two spoken faults only on an explicit second request', () => {
    expect(splitSpokenFaults('a leak and also the air conditioner')).toEqual([
      'a leak',
      'the air conditioner',
    ])
    expect(splitSpokenFaults("une fuite et aussi la climatisation")).toEqual([
      'une fuite',
      'la climatisation',
    ])
    expect(splitSpokenFaults('the AC is broken and not cooling')).toEqual([
      'the AC is broken and not cooling',
    ])
  })

  it('recognizes a status question in English and French', () => {
    expect(isStatusQuestion("what's the status")).toBe(true)
    expect(isStatusQuestion('où en est la demande')).toBe(true)
    expect(isStatusQuestion('the lock is stuck')).toBe(false)
  })
})
