/**
 * Detect PostgREST/Postgres errors when production DB is behind app migrations.
 * Used to degrade gracefully until `npm run db:migrate` is applied.
 *
 * Supabase-js often returns plain `{ message, code, … }` objects — not `Error`.
 */
function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  if (err && typeof err === 'object' && 'message' in err) {
    const msg = (err as { message?: unknown }).message
    if (typeof msg === 'string') return msg
  }
  return String(err)
}

export function isSupabaseSchemaError(err: unknown): boolean {
  const msg = errorMessage(err)
  const code =
    err && typeof err === 'object' && 'code' in err
      ? String((err as { code?: unknown }).code ?? '')
      : ''
  return (
    msg.includes('schema cache') ||
    msg.includes('Could not find the table') ||
    msg.includes('does not exist') ||
    // PostgREST / Postgres common “relation missing” codes
    code === '42P01' ||
    code === 'PGRST205'
  )
}

export function isMissingColumnError(err: unknown, column?: string): boolean {
  const msg = errorMessage(err)
  if (!msg.includes('does not exist') || !msg.includes('column')) return false
  if (!column) return true
  return msg.includes(column)
}

export function isMissingTableError(err: unknown, table?: string): boolean {
  const msg = errorMessage(err)
  if (!msg.includes('schema cache') && !msg.includes('Could not find the table')) {
    return false
  }
  if (!table) return true
  return msg.includes(table)
}
