import { beforeEach, describe, expect, it } from 'vitest'
import {
  __resetMemWhatsAppFailures,
  enqueueWhatsAppSendFailure,
  listPendingWhatsAppFailures,
  markWhatsAppFailureResult,
  shouldEnqueueWhatsAppFailure,
} from './send-failures'

describe('whatsapp send-failures queue', () => {
  beforeEach(() => {
    process.env.MAINTAINOS_FORCE_MEMORY = '1'
    __resetMemWhatsAppFailures()
  })

  it('enqueues transient failures only', () => {
    expect(
      shouldEnqueueWhatsAppFailure({
        ok: false,
        httpStatus: 503,
        errorCode: 2,
      }),
    ).toBe(true)
    expect(
      shouldEnqueueWhatsAppFailure({
        ok: false,
        errorCode: 131047,
        httpStatus: 400,
      }),
    ).toBe(false)
    expect(
      shouldEnqueueWhatsAppFailure({ ok: true, httpStatus: 200 }),
    ).toBe(false)
  })

  it('lists and marks memory failures', async () => {
    const enq = await enqueueWhatsAppSendFailure({
      toWaId: '972501234567',
      purpose: 'ops_reply',
      sendKind: 'text',
      payload: { text: 'שלום' },
      metaErrorCode: 2,
      metaErrorMessage: 'temp',
    })
    expect(enq?.backend).toBe('memory')

    const { rows } = await listPendingWhatsAppFailures()
    expect(rows).toHaveLength(1)

    await markWhatsAppFailureResult({
      id: rows[0].id,
      ok: true,
      backend: 'memory',
    })
    const after = await listPendingWhatsAppFailures()
    expect(after.rows).toHaveLength(0)
  })
})
