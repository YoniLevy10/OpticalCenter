import { NextResponse } from 'next/server'
import {
  authErrorResponse,
  getActorFromRequest,
} from '@/lib/auth/request-actor'
import { AuthError } from '@/lib/auth/types'
import { validateMediaFile, MEDIA_LIMITS } from '@/modules/tickets/media-limits'
import {
  persistTicketAttachment,
  uploadTicketMediaFile,
} from '@/modules/tickets/media-upload'
import { getById } from '@/modules/tickets/service'
import { captureError } from '@/lib/monitoring'
import { checkRateLimit, clientIpFromRequest } from '@/lib/rate-limit'

const MAX_FILES = MEDIA_LIMITS.maxFiles

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id: ticketId } = await context.params
    const ip = clientIpFromRequest(request)
    const limited = checkRateLimit(`ticket-media:${ticketId}:${ip}`, 10, 60_000)
    if (!limited.allowed) {
      return NextResponse.json({ error: 'יותר מדי בקשות' }, { status: 429 })
    }

    const ticket = await getById(ticketId)
    if (!ticket) {
      return NextResponse.json({ error: 'תקלה לא נמצאה' }, { status: 404 })
    }

    const actor = await getActorFromRequest(request).catch(() => null)
    if (!actor && ticket.source !== 'web_fallback') {
      return NextResponse.json({ error: 'אין הרשאה' }, { status: 401 })
    }

    const form = await request.formData()
    const files = form.getAll('files').filter((f): f is File => f instanceof File)
    if (files.length === 0) {
      const single = form.get('file')
      if (single instanceof File) files.push(single)
    }
    if (files.length === 0 || files.length > MAX_FILES) {
      return NextResponse.json({ error: 'עד 3 קבצים' }, { status: 400 })
    }

    const urls: string[] = []
    for (const file of files) {
      const check = validateMediaFile(file)
      if (!check.ok) {
        return NextResponse.json({ error: check.error }, { status: 400 })
      }
      const url = await uploadTicketMediaFile(ticketId, file, check.kind)
      await persistTicketAttachment(ticketId, url, check.kind)
      urls.push(url)
    }

    return NextResponse.json({ ok: true, urls }, { status: 201 })
  } catch (err) {
    if (err instanceof AuthError) return authErrorResponse(err)
    captureError(err, { route: 'POST /api/tickets/[id]/attachments' })
    return NextResponse.json({ error: 'שגיאה' }, { status: 500 })
  }
}
