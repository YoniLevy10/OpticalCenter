/** Previous calendar month as YYYY-MM + inclusive date range. */
export function previousMonthRange(now = new Date()): {
  month: string
  from: string
  to: string
  label: string
} {
  const d = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const y = d.getFullYear()
  const m = d.getMonth()
  const from = `${y}-${String(m + 1).padStart(2, '0')}-01`
  const lastDay = new Date(y, m + 1, 0).getDate()
  const to = `${y}-${String(m + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  const month = `${y}-${String(m + 1).padStart(2, '0')}`
  return { month, from, to, label: `דוח חודשי ${month}` }
}
