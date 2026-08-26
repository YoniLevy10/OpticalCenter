import { describe, expect, it } from 'vitest'
import {
  isMissingColumnError,
  isMissingTableError,
  isSupabaseSchemaError,
} from '@/lib/supabase/schema-fallback'

describe('schema-fallback', () => {
  it('detects missing table in schema cache', () => {
    expect(
      isSupabaseSchemaError(
        new Error("Could not find the table 'public.vendors' in the schema cache"),
      ),
    ).toBe(true)
  })

  it('detects missing column', () => {
    expect(
      isMissingColumnError(
        new Error('column intake_sessions.human_takeover does not exist'),
        'human_takeover',
      ),
    ).toBe(true)
  })

  it('detects missing table by name', () => {
    expect(
      isMissingTableError(
        new Error("Could not find the table 'public.vendors' in the schema cache"),
        'vendors',
      ),
    ).toBe(true)
  })
})
