import { listConflicts, listContacts, listDocuments, listSpends, listTasks } from '@/lib/data/ops-ledger'
import { ISRAEL_STORES } from '@/modules/stores/israel-stores'
import { isDocumentOverdue } from '@/modules/documents/rules'
import { invoiceVariance } from '@/modules/spend/policy'
import type { Locale } from '@/lib/i18n/locale'
import { phrase } from '@/lib/i18n/phrases'
import type { DecisionItem } from './queue'

export function ledgerDecisions(now = new Date(), locale: Locale = 'he'): DecisionItem[] {
  const items: DecisionItem[] = []

  for (const spend of listSpends()) {
    if (spend.status !== 'pending' && spend.status !== 'needs_info' && !invoiceVariance(spend)) {
      continue
    }
    const variance = invoiceVariance(spend)
    items.push({
      id: `spend:${spend.id}`,
      kind: 'spend',
      title: variance
        ? `${phrase(locale, 'חריגת חשבונית')} · ${spend.reason}`
        : spend.reason,
      storeCode: spend.storeCode || '—',
      storeName: spend.storeName,
      owner: spend.requestedBy || phrase(locale, 'סניף'),
      urgency: spend.urgent || variance ? 'overdue' : 'today',
      action: variance
        ? phrase(locale, 'לבדוק חריגה')
        : spend.status === 'needs_info'
          ? phrase(locale, 'להשלים מידע')
          : phrase(locale, 'לאשר'),
      href: '/ops/approvals',
      spendId: spend.id,
    })
  }

  for (const doc of listDocuments()) {
    if (!isDocumentOverdue(doc, now) && doc.intakeStatus !== 'needs_review') continue
    items.push({
      id: `doc:${doc.id}`,
      kind: 'document',
      title: doc.docType,
      storeCode: doc.storeCode,
      storeName: doc.storeName,
      owner: doc.owner || 'לא הוגדר',
      urgency: isDocumentOverdue(doc, now) ? 'overdue' : 'today',
      action: doc.intakeStatus === 'needs_review' ? 'לבדוק מסמך' : 'לחדש מסמך',
      href: '/ops/documents',
    })
  }

  for (const contact of listContacts()) {
    if (!contact.isActive || contact.phoneStatus !== 'needs_verification') continue
    const digits = contact.phone.replace(/\D/g, '')
    const store = ISRAEL_STORES.find(
      (row) => row.managerPhone.replace(/\D/g, '') === digits,
    )
    items.push({
      id: `verify:${contact.id}`,
      kind: 'verify',
      title: `${contact.fullName} · ${contact.phone}`,
      storeCode: store?.code ?? '—',
      storeName: store?.name ?? 'סניף',
      owner: 'ארי',
      urgency: 'today',
      action: 'לאמת טלפון',
      href: store ? `/ops/stores/${store.code}` : '/ops/stores',
    })
  }

  for (const task of listTasks()) {
    if (task.done || !task.needsClarification) continue
    items.push({
      id: `task:${task.id}`,
      kind: 'task',
      title: task.title,
      storeCode: task.storeCode || '—',
      storeName: task.storeCode || 'משימה',
      owner: task.assignee || 'לא צוין',
      urgency: 'today',
      action: task.clarification || 'להבהיר',
      href: '/ops/tasks',
    })
  }

  for (const conflict of listConflicts()) {
    items.push({
      id: `conflict:${conflict.id}`,
      kind: 'conflict',
      title: `${conflict.field}: ${conflict.current} / ${conflict.incoming}`,
      storeCode: '—',
      storeName: 'סנכרון',
      owner: 'ארי',
      urgency: 'today',
      action: 'להכריע בסתירה',
      href: '/ops/stores',
    })
  }

  return items
}
