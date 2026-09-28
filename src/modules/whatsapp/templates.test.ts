import { describe, expect, it } from 'vitest'
import {
  META_WA_TEMPLATES,
  defaultSessionTemplateName,
  defaultSessionTemplateLang,
} from './templates'

describe('META_WA_TEMPLATES', () => {
  it('defines maintainos_followup for outside-24h reopen', () => {
    expect(META_WA_TEMPLATES.followup.metaName).toBe('maintainos_followup')
    expect(META_WA_TEMPLATES.followup.language).toBe('he')
    expect(META_WA_TEMPLATES.followup.category).toBe('UTILITY')
    expect(META_WA_TEMPLATES.followup.body).toContain('Optical Center')
    expect(META_WA_TEMPLATES.followup.quickReplies.every((t) => t.length <= 25)).toBe(
      true,
    )
  })

  it('defaults session template from env or maintainos_followup', () => {
    expect(defaultSessionTemplateName()).toMatch(/^[a-z0-9_]+$/)
    expect(defaultSessionTemplateLang()).toBe('he')
  })
})
