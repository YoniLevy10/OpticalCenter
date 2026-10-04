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

  it('detects PostgREST plain-object schema errors (not Error instances)', () => {
    expect(
      isSupabaseSchemaError({
        message: "Could not find the table 'public.professionals' in the schema cache",
        code: 'PGRST205',
      }),
    ).toBe(true)
    expect(isSupabaseSchemaError({ message: 'relation does not exist', code: '42P01' })).toBe(
      true,
    )
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
