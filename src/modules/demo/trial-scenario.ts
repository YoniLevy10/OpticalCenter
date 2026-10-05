import type { TicketPriority } from '@/modules/tickets/constants'

export type TrialFault = {
  id: string
  storeCode: string
  category: string
  /** Stored urgency — may differ from the text classifier so it can be tried. */
  priority: TicketPriority
  title: string
  description: string
  hoursAgo: number
  /** When set, both SLA clocks are already this many hours overdue. */
  breachHours?: number
  assignDemoTech?: boolean
}

export const TRIAL_FAULTS: readonly TrialFault[] = [
  {
    id: 'trial-6001-electrical',
    storeCode: '6001',
    category: 'electrical_hazard',
    priority: 'critical',
    title: 'ריח שרוף בלוח החשמל',
    description: 'ריח שרוף עולה מלוח החשמל בחנות. הפסקנו את המעגל והאולם חשוך חלקית.',
    hoursAgo: 6,
    breachHours: 3,
  },
  {
    id: 'trial-6006-hvac',
    storeCode: '6006',
    category: 'hvac',
    priority: 'medium',
    title: 'המזגן באולם לא מקרר',
    description: 'המזגן הראשי באולם פועל אבל לא מקרר. הטמפרטורה גבוהה והלקוחות מתלוננים.',
    hoursAgo: 2,
    assignDemoTech: true,
  },
  {
    id: 'trial-6015-plumbing',
    storeCode: '6015',
    category: 'plumbing',
    priority: 'high',
    title: 'נזילה בשירותי הצוות',
    description: 'נזילת מים מתחת לכיור בשירותים. הרצפה רטובה וצריך לסגור את הברז הראשי.',
    hoursAgo: 5,
  },
  {
    id: 'trial-6037-security',
    storeCode: '6037',
    category: 'security',
    priority: 'critical',
    title: 'מנעול הדלת האחורית תקוע',
    description: 'המנעול של הדלת האחורית לא ננעל. המחסן נשאר פתוח אחרי סגירה.',
    hoursAgo: 1,
  },
  {
    id: 'trial-6017-it',
    storeCode: '6017',
    category: 'it',
    priority: 'low',
    title: 'הקופה לא מתחברת',
    description: 'מסוף הקופה לא מתחבר לרשת. אי אפשר לסגור מכירות בקופה השנייה.',
    hoursAgo: 8,
  },
  {
    id: 'trial-6023-cleaning',
    storeCode: '6023',
    category: 'cleaning',
    priority: 'low',
    title: 'ריח חזק בשירותים',
    description: 'ריח חזק בשירותי הלקוחות. הניקיון לא הספיק לפתיחה.',
    hoursAgo: 3,
  },
]

export type TrialSpendSeed = {
  id: string
  storeCode: string
  ticketId: string | null
  reason: string
  vendorName: string
  requestedAmount: number
  scope: string
  urgent: boolean
  status: 'pending' | 'approved'
}

/** Payment requests raised by store managers, waiting for Ari. */
export const TRIAL_SPENDS: readonly TrialSpendSeed[] = [
  {
    id: 'trial-spend-6001',
    storeCode: '6001',
    ticketId: 'trial-6001-electrical',
    reason: 'חשמלאי חירום ללוח',
    vendorName: 'חשמלנט · חשמל',
    requestedAmount: 1800,
    scope: 'בדיקת לוח והחלפת מפסק',
    urgent: true,
    status: 'pending',
  },
  {
    id: 'trial-spend-6006',
    storeCode: '6006',
    ticketId: 'trial-6006-hvac',
    reason: 'מילוי גז וטיפול במזגן אולם',
    vendorName: 'קלימה סנטר · מיזוג',
    requestedAmount: 2400,
    scope: 'ביקור + מילוי גז',
    urgent: false,
    status: 'pending',
  },
  {
    id: 'trial-spend-6015',
    storeCode: '6015',
    ticketId: 'trial-6015-plumbing',
    reason: 'אינסטלטור לנזילה',
    vendorName: 'זרם המרכז · אינסטלציה',
    requestedAmount: 950,
    scope: 'איתור נזילה וסיפון',
    urgent: false,
    status: 'pending',
  },
  {
    id: 'trial-spend-6037',
    storeCode: '6037',
    ticketId: 'trial-6037-security',
    reason: 'מנעולן אחרי סגירה',
    vendorName: 'מנעול הצפון',
    requestedAmount: 700,
    scope: 'החלפת צילינדר',
    urgent: true,
    status: 'approved',
  },
]
