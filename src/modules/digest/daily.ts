import type { DecisionItem } from '@/modules/decisions/queue'

export type DailyDigest = {
  pendingApprovals: number
  urgentFaults: number
  tasksToday: number
  overdueDocuments: number
  headline: string
}

export function buildDailyDigest(input: {
  decisions: DecisionItem[]
  openTasks: number
}): DailyDigest {
  const pendingApprovals = input.decisions.filter((item) => item.kind === 'spend').length
  const urgentFaults = input.decisions.filter(
    (item) => item.kind === 'ticket' && item.urgency === 'overdue',
  ).length
  const overdueDocuments = input.decisions.filter((item) => item.kind === 'document').length
  const headline = [
    pendingApprovals ? `${pendingApprovals} אישורים` : null,
    urgentFaults ? `${urgentFaults} תקלות באיחור` : null,
    input.openTasks ? `${input.openTasks} משימות` : null,
    overdueDocuments ? `${overdueDocuments} מסמכים` : null,
  ]
    .filter(Boolean)
    .join(' · ')
  return {
    pendingApprovals,
    urgentFaults,
    tasksToday: input.openTasks,
    overdueDocuments,
    headline: headline || 'אין החלטות דחופות להיום',
  }
}
