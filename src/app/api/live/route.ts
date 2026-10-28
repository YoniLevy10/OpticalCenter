import { createHash } from 'node:crypto'
import { NextResponse } from 'next/server'
import { getActorFromRequest } from '@/lib/auth/request-actor'
import { shouldAllowDemoEntry } from '@/lib/auth/home-path'
import { internalLiveCursor } from '@/lib/data/live-cursor'
import { supabaseReady } from '@/lib/data/memory-store'
import { createSystemClient } from '@/lib/supabase/system'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function digest(value: string): string {
  return createHash('sha1').update(value).digest('hex').slice(0, 16)
}

async function latest(
  table: 'tickets' | 'ticket_events' | 'ticket_messages' | 'inbox_messages',
  column: 'updated_at' | 'created_at',
): Promise<string> {
  const supabase = createSystemClient('live_stamp')
  const { data, error, count } = await supabase
    .from(table)
    .select(column, { count: 'exact' })
    .order(column, { ascending: false })
    .limit(1)
  if (error) return 'err'
  const row = data?.[0] as Record<string, string | null> | undefined
  return `${count ?? 0}:${row?.[column] ?? ''}`
}

/**
 * Cursor for every open HQ, store, and tech screen.
 * The internal server is the memory store plus the ops ledger. Supabase is
 * folded in when it is the system of record.
 */
export async function GET(request: Request) {
  const actor = await getActorFromRequest(request)
  if (!actor && !shouldAllowDemoEntry()) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  let remote = 'off'
  if (await supabaseReady()) {
    try {
      const parts = await Promise.all([
        latest('tickets', 'updated_at'),
        latest('ticket_events', 'created_at'),
        latest('ticket_messages', 'created_at'),
        latest('inbox_messages', 'created_at'),
      ])
      remote = parts.join('|')
    } catch {
      remote = 'err'
    }
  }

  const cursor = digest(`${internalLiveCursor()}#${remote}`)
  return NextResponse.json(
    { cursor },
    { headers: { 'cache-control': 'no-store' } },
  )
}
