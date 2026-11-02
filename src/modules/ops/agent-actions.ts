import { persistOpsLedger } from '@/lib/data/ops-db'
import { addDocument, addTask, listTasks } from '@/lib/data/ops-ledger'
import { expiryFromText } from '@/modules/drive/import'
import { ISRAEL_STORES, israelStoreId, type IsraelStoreSeed } from '@/modules/stores/israel-stores'
import type { TicketPriority } from '@/modules/tickets/constants'
import { repairRangeLine } from '@/modules/recommendations/estimate'
import { createTicket, formatDisplayNumber, type TicketSource } from '@/modules/tickets/service'

type Turn = { role: 'user' | 'assistant'; text: string }

export type AriLink = { href: string; label: string }

export type AriAct = { reply: string; links: AriLink[] }

export type OpenFaultHint = {
  id?: string
  storeName: string
  summary: string
  displayNumber: string | null
}

const CREATE_TASK =
  /(?:פתח|תפתח|צור|תיצור|תוסיף|הוסף|רשום|תרשום)\s+(?:לי\s+)?(?:על\s+(?:זה\s+)?)?משימה|תזכיר לי/
const CREATE_TICKET =
  /(?:פתח|תפתח|צור|תיצור|תוסיף|הוסף|רשום|תרשום|דווח)\s+(?:לי\s+)?(?:על\s+(?:זה\s+)?)?(?:תקלה|קריאה)(?!\s+ה)/

export async function actForAri(input: {
  message: string
  history?: Turn[]
  open?: OpenFaultHint[]
  source?: Extract<TicketSource, 'web_fallback' | 'whatsapp'>
}): Promise<AriAct | null> {
  const message = input.message.trim()
  const task = CREATE_TASK.test(message)
  const ticket = CREATE_TICKET.test(message)
  const permit = /כיבוי אש|אישור כיבוי|רישיון/.test(message)
  if (!task && !ticket && !permit) return null

  const historyText = (input.history ?? [])
    .filter((turn) => turn.role === 'assistant')
    .slice(-2)
    .map((turn) => turn.text)
    .join('\n')
  const named = pickStore(message)
  const remembered = pickStore(historyText)
  const store = named.store ?? (named.ambiguous.length === 0 ? remembered.store : null)
  const body = cleanBody(message, store?.name ?? null)
  const blurb = blurbFrom(historyText)

  if (named.ambiguous.length > 1) {
    return say(`באיזה סניף? יש ${named.ambiguous.map((row) => row.name).slice(0, 3).join(' ו')}.`)
  }

  if (!ticket && permit) {
    const title = (body.length >= 3 ? body : blurb) || 'חידוש אישור'
    if (!store) {
      const created = addTask({
        title: title.slice(0, 200),
        storeId: null,
        storeCode: null,
        assignee: null,
        dueAt: null,
        ticketId: null,
        documentId: null,
        spendId: null,
        needsClarification: true,
        clarification: 'באיזה סניף האישור?',
      })
      await persistOpsLedger().catch(() => undefined)
      return say(`רשמתי משימה לחידוש אישור. חסר סניף.`, taskLink(created.id))
    }
    const expiry = expiryFromText(message)
    const doc = addDocument({
      storeId: israelStoreId(store.stableKey ?? store.code),
      storeCode: store.code,
      storeName: store.name,
      docType: /חשמל/.test(message) ? 'electrical' : 'fire',
      sourceUrl: null,
      extractedExpiry: expiry,
      computedNextCheck: null,
      owner: null,
      intakeStatus: expiry ? 'ingested' : 'needs_review',
      intakeReason: expiry ? null : 'תאריך התוקף לא ברור',
    })
    await persistOpsLedger().catch(() => undefined)
    return say(
      expiry
        ? `רשמתי ${doc.docType === 'electrical' ? 'אישור חשמל' : 'אישור כיבוי אש'} בסניף ${store.name}.`
        : `רשמתי אישור לסניף ${store.name}. חסר תאריך תוקף.`,
      { href: '/ops/documents', label: 'מסמכים' },
    )
  }

  if (task) {
    const title = (body.length >= 3 ? body : blurb) || ''
    if (title.length < 3) return say('מה לרשום במשימה?')
    const existing = listTasks().find((row) => !row.done && row.title.trim() === title)
    if (existing) {
      return say(`המשימה כבר רשומה: ${existing.title}.`, taskLink(existing.id))
    }
    const created = addTask({
      title: title.slice(0, 200),
      storeId: store ? israelStoreId(store.stableKey ?? store.code) : null,
      storeCode: store?.code ?? null,
      assignee: null,
      dueAt: null,
      ticketId: null,
      documentId: null,
      spendId: null,
      needsClarification: false,
      clarification: null,
    })
    await persistOpsLedger().catch(() => undefined)
    const reply = store ? `רשמתי משימה: ${title}. בסניף ${store.name}.` : `רשמתי משימה: ${title}.`
    return say(reply, taskLink(created.id))
  }

  if (!store) {
    return say(body.length >= 3 ? `באיזה סניף לפתוח את «${body}»?` : 'מה התקלה, ובאיזה סניף?')
  }
  const description = (body.length >= 3 ? body : blurb) || ''
  if (description.length < 3) return say(`מה התקלה ב${store.name}?`)

  const force = /בכל זאת|חדשה|עוד אחת/.test(message)
  const duplicate = force
    ? null
    : (input.open ?? []).find(
        (fault) => fault.storeName === store.name && sharesWords(fault.summary, description),
      )
  if (duplicate) {
    const number = duplicate.displayNumber ? `${duplicate.displayNumber}: ` : ''
    const link = duplicate.id
      ? { href: `/ops/tickets/${duplicate.id}`, label: duplicate.displayNumber || 'לתקלה' }
      : null
    return say(`התקלה כבר פתוחה ב${store.name}. ${number}${duplicate.summary}.`, link)
  }

  try {
    const category = guessCategory(`${message} ${description}`)
    const created = await createTicket({
      storeCode: store.code,
      description,
      title: description.slice(0, 80),
      category,
      priority: guessPriority(message),
      source: input.source ?? 'web_fallback',
      reporterName: 'ארי',
      language: 'he',
    })
    const number = created.display_number || formatDisplayNumber(created.number) || ''
    const label = number ? `${number}. ` : ''
    const next = /נזיל|חשמל|מזגן|מיזוג|אבטחה|מצלמ|דלת/.test(message)
      ? 'הצעד הוא לאשר איש מקצוע ומחיר.'
      : 'היא נשארת בתור לשילוב ביקור.'
    return say(`פתחתי תקלה ב${store.name}: ${description}. ${label}${next} ${repairRangeLine(category)}`, {
      href: `/ops/tickets/${created.id}`,
      label: number || 'לתקלה',
    })
  } catch {
    return say('לא הצלחתי לפתוח את התקלה.')
  }
}

function say(reply: string, link?: AriLink | null): AriAct {
  return { reply, links: link ? [link] : [] }
}

function taskLink(id: string): AriLink {
  return { href: `/ops/tasks#task-${id}`, label: 'למשימה' }
}

function pickStore(text: string): { store: IsraelStoreSeed | null; ambiguous: IsraelStoreSeed[] } {
  if (!text) return { store: null, ambiguous: [] }
  const exact = unique(
    ISRAEL_STORES.filter(
      (store) => text.includes(store.name) || new RegExp(`(?:סניף\\s*)?${store.code}\\b`).test(text),
    ),
  )
  if (exact.length === 1) return { store: exact[0]!, ambiguous: [] }
  if (exact.length > 1) return { store: null, ambiguous: exact }
  const byCity = unique(ISRAEL_STORES.filter((store) => store.city.length >= 3 && text.includes(store.city)))
  if (byCity.length === 1) return { store: byCity[0]!, ambiguous: [] }
  return { store: null, ambiguous: byCity }
}

function unique(stores: IsraelStoreSeed[]): IsraelStoreSeed[] {
  const seen = new Set<string>()
  return stores.filter((store) => {
    if (seen.has(store.code)) return false
    seen.add(store.code)
    return true
  })
}

function cleanBody(message: string, storeName: string | null): string {
  let body = message.replace(CREATE_TASK, ' ').replace(CREATE_TICKET, ' ')
  body = body.replace(/על זה|את זה|בסניף הזה|בכל זאת|עוד אחת/g, ' ')
  if (storeName) body = body.replace(storeName, ' ')
  for (const store of ISRAEL_STORES) {
    if (store.city.length >= 3 && body.includes(store.city)) body = body.replace(store.city, ' ')
    if (new RegExp(`(?:סניף\\s*)?${store.code}\\b`).test(body)) {
      body = body.replace(new RegExp(`סניף\\s*${store.code}\\b|${store.code}\\b`), ' ')
    }
  }
  return body
    .replace(/בסניף|סניף/g, ' ')
    .replace(/(?:^|\s)[בלמ](?=\s|$)/g, ' ')
    .replace(/[,\s:\-–]+/g, ' ')
    .trim()
}

function blurbFrom(text: string): string | null {
  const colon = text.match(/:\s*([^.]{4,80})/)
  return colon?.[1]?.trim() || null
}

function sharesWords(summary: string, description: string): boolean {
  const words = description.split(/\s+/).filter((word) => word.length >= 4)
  return words.some((word) => summary.includes(word))
}

function guessPriority(text: string): TicketPriority {
  if (/קריטי/.test(text)) return 'critical'
  if (/דחוף/.test(text)) return 'high'
  return 'medium'
}

function guessCategory(text: string): string {
  if (/נזיל|אינסטל|ברז|כיור/.test(text)) return 'plumbing'
  if (/מזגן|מיזוג|קירור/.test(text)) return 'hvac'
  if (/חשמל/.test(text)) return 'electrical'
  if (/מנעול|אבטחה|דלת|מצלמ/.test(text)) return 'security'
  if (/מדפס|קופה|מחשב|רשת/.test(text)) return 'it'
  if (/ניקיון/.test(text)) return 'cleaning'
  return 'other'
}
