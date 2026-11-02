/** Israeli mobile that is safe to text. Demo seed numbers are not. */
export function isDeliverableTechPhone(raw: string | null | undefined): boolean {
  if (!raw) return false
  const digits = raw.replace(/\D/g, '')
  if (!digits) return false
  let local = digits
  if (local.startsWith('972')) local = `0${local.slice(3)}`
  else if (/^5\d{8}$/.test(local)) local = `0${local}`
  if (!/^05\d{8}$/.test(local)) return false
  if (/^0501100\d{3}$/.test(local)) return false
  if (local === '0501234567' || local === '0509876543') return false
  return true
}

export function faultBelongsInVisitSms(item: {
  status: string
  error?: string | null
}): boolean {
  return item.status === 'sent' || item.status === 'labeled' || item.status === 'ack'
}

export function buildVisitFaultsSms(input: {
  storeName: string
  faults: { display: string; title: string }[]
}): string {
  const faults = input.faults.filter((fault) => fault.display || fault.title).slice(0, 8)
  const lines = faults.map((fault, index) => {
    const title = fault.title.replace(/\s+/g, ' ').trim()
    const display = fault.display.trim()
    const body = [display, title].filter(Boolean).join(' · ')
    return `${index + 1}. ${body}`
  })
  const extra = input.faults.length - faults.length
  if (extra > 0) lines.push(`ועוד ${extra}`)
  return [`ביקור Optical Center`, input.storeName.trim() || 'חנות', '', ...lines]
    .filter((line, index) => index < 3 || line)
    .join('\n')
    .trim()
}
