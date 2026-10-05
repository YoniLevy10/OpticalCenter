export type ParsedVoiceTask = {
  title: string
  storeHint: string | null
  assigneeHint: string | null
  dueHint: string | null
  needsClarification: boolean
  clarification: string | null
  financial: boolean
}

const MONEY = /שקל|₪|הצעת מחיר|תשלום|חשבונית|הזמנ/

/** One recording can hold several tasks, split on newlines or "וגם". */
export function splitVoiceTranscript(transcript: string): ParsedVoiceTask[] {
  const chunks = transcript
    .split(/\n+|וגם\s+|ועוד\s+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 1)
  if (chunks.length === 0) {
    return [
      {
        title: '',
        storeHint: null,
        assigneeHint: null,
        dueHint: null,
        needsClarification: true,
        clarification: 'לא שמעתי משימה. אפשר לחזור על ההקלטה?',
        financial: false,
      },
    ]
  }
  return chunks.map(parseChunk)
}

function parseChunk(text: string): ParsedVoiceTask {
  const store = text.match(/סניף\s+([0-9]{2,6}|[\u0590-\u05FF]{2,})/)
  const assignee = text.match(/(?:אחראי|לטפל|ש)\s+([\u0590-\u05FF]{2,})/)
  const due = text.match(/עד\s+([^,.]+)|מחר|היום/)
  const missingAssignee = !assignee
  const missingDue = !due
  const needs = missingAssignee || missingDue
  const questions = [
    missingAssignee ? 'למי המשימה מיועדת?' : null,
    missingDue ? 'לאיזה מועד?' : null,
  ].filter(Boolean)
  return {
    title: text,
    storeHint: store?.[1] ?? null,
    assigneeHint: assignee?.[1] ?? null,
    dueHint: due?.[0] ?? null,
    needsClarification: needs,
    clarification: questions.length ? questions.join(' ') : null,
    financial: MONEY.test(text),
  }
}
