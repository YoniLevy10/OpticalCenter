import { plainStatus } from '@/components/ops/plain-labels'

export type ReporterTicket = {
  displayNumber: string
  status: string
  spendApproved: boolean | null
}

export function isStatusQuestion(text: string | null | undefined): boolean {
  if (!text) return false
  return /מה המצב|מה קורה|סטטוס|איפה הפנ|איפה הפנייה|עודכן/.test(text)
}

export function statusReply(tickets: ReporterTicket[]): string {
  if (tickets.length === 0) {
    return 'לא מצאתי פנייה פתוחה מהמספר הזה. אפשר לשלוח את קוד הסניף ואז את הדיווח.'
  }
  return tickets
    .slice(0, 3)
    .map((ticket) => {
      const money =
        ticket.spendApproved == null
          ? 'הדיווח נקלט. אין בקשת הוצאה שממתינה לאישור.'
          : ticket.spendApproved
            ? 'ההוצאה אושרה.'
            : 'הבקשה נקלטת וממתינה לאישור. היא עדיין לא אושרה.'
      return `פנייה ${ticket.displayNumber}: ${plainStatus(ticket.status)}.\n${money}`
    })
    .join('\n\n')
}

export function handoffReply(): string {
  return 'לא הצלחתי להבין את הדיווח. מעבירים אותו לאדם, והוא יחזור אליך.'
}

export function voiceNeedsReviewReply(): string {
  return 'ההקלטה התקבלה. התמלול דורש בדיקה — כתבו בקצרה מה צריך, אם אפשר.'
}
