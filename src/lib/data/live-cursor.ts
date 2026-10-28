import {
  listDocuments,
  listFiles,
  listSpends,
  listStock,
  listTasks,
} from '@/lib/data/ops-ledger'
import {
  memGetSettings,
  memListAssets,
  memListDispatches,
  memListInboxMessages,
  memListProfessionals,
  memListSessions,
  memListStores,
  memListTickets,
  memListVendors,
} from '@/lib/data/memory-store'

/** Stable fingerprint of the in-process server. Changes when operational data changes. */
export function internalLiveCursor(): string {
  const tickets = memListTickets()
    .map(
      (t) =>
        `${t.id}:${t.status}:${t.priority}:${t.assigned_to ?? ''}:${t.updated_at}:${t.store_confirmed_at ?? ''}:${t.display_number ?? ''}:${t.messages.length}:${t.events.length}:${t.messages.at(-1)?.created_at ?? ''}`,
    )
    .sort()
    .join('\n')
  const sessions = memListSessions()
    .map(
      (s) =>
        `${s.wa_id}:${s.state}:${s.human_takeover ? 1 : 0}:${s.active_ticket_id ?? ''}:${s.updated_at}:${s.pending_description ?? ''}`,
    )
    .sort()
    .join('\n')
  const stores = memListStores({ activeOnly: false })
    .map((s) => `${s.id}:${s.code}:${s.name}:${s.city ?? ''}:${s.is_active ? 1 : 0}`)
    .sort()
    .join('\n')
  const assets = memListAssets()
    .map((a) => `${a.id}:${a.status}:${a.name}:${a.store_id}`)
    .sort()
    .join('\n')
  const vendors = memListVendors()
    .map((v) => `${v.id}:${v.name}:${v.preferred ? 1 : 0}:${v.active ? 1 : 0}:${v.contact_phone ?? ''}`)
    .sort()
    .join('\n')
  const professionals = memListProfessionals({ activeOnly: false })
    .map((p) => `${p.id}:${p.use_count}:${p.last_contacted_at ?? ''}:${p.phone ?? ''}`)
    .sort()
    .join('\n')
  const spends = listSpends()
    .map(
      (s) =>
        `${s.id}:${s.status}:${s.updatedAt}:${s.approvedAmount ?? ''}:${s.actualAmount ?? ''}`,
    )
    .sort()
    .join('\n')
  const tasks = listTasks()
    .map((t) => `${t.id}:${t.done ? 1 : 0}:${t.title}`)
    .sort()
    .join('\n')
  const documents = listDocuments()
    .map((d) => `${d.id}:${d.intakeStatus}:${d.localUpdatedAt ?? ''}`)
    .sort()
    .join('\n')

  return hash(
    [
      tickets,
      sessions,
      stores,
      assets,
      vendors,
      professionals,
      JSON.stringify(memGetSettings()),
      spends,
      tasks,
      documents,
      memListSessions()
        .map((session) => {
          const messages = memListInboxMessages(session.wa_id)
          const last = messages.at(-1)
          return `${session.wa_id}:${messages.length}:${last?.id ?? ''}:${last?.created_at ?? ''}`
        })
        .sort()
        .join('\n'),
      memListDispatches()
        .map((row) => `${row.id}:${row.status}:${row.updated_at}`)
        .sort()
        .join('\n'),
      listStock()
        .map((row) => `${row.itemId}:${row.locationId}:${row.quantity}:${row.verified ? 1 : 0}`)
        .sort()
        .join('\n'),
      listFiles()
        .map((row) => `${row.id}:${row.status}:${row.deletedInSource ? 1 : 0}:${row.localUpdatedAt ?? ''}`)
        .sort()
        .join('\n'),
    ].join('\n--\n'),
  )
}

function hash(input: string): string {
  let h = 2166136261
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0).toString(16)
}
