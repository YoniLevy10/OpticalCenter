export type SectionMark = 'critical' | 'warning' | 'ok' | 'progress'

/**
 * Chrome stays ink. These marks no longer paint a color per screen —
 * red, amber, and green belong on a live signal, not on a tab.
 */
export function sectionMark(_href: string): SectionMark {
  return 'progress'
}

const quietChip = 'bg-transparent text-ink-2'
const quietIcon = 'text-ink-2'
const quietRule = 'bg-[var(--tenant)]'

export const sectionChipClass: Record<SectionMark, string> = {
  critical: quietChip,
  warning: quietChip,
  ok: quietChip,
  progress: quietChip,
}

export const sectionIconClass: Record<SectionMark, string> = {
  critical: quietIcon,
  warning: quietIcon,
  ok: quietIcon,
  progress: quietIcon,
}

export const sectionRuleClass: Record<SectionMark, string> = {
  critical: quietRule,
  warning: quietRule,
  ok: quietRule,
  progress: quietRule,
}

export const sectionEdgeColor: Record<SectionMark, string> = {
  critical: 'var(--border)',
  warning: 'var(--border)',
  ok: 'var(--border)',
  progress: 'var(--border)',
}
