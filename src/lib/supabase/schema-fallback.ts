/**
 * Detect PostgREST/Postgres errors when production DB is behind app migrations.
 * Used to degrade gracefully until `npm run db:migrate` is applied.
 */
export function isSupabaseSchemaError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err)
  return (
    msg.includes('schema cache') ||
    msg.includes('Could not find the table') ||
    msg.includes('does not exist')
  )
}

export function isMissingColumnError(err: unknown, column?: string): boolean {
  const msg = err instanceof Error ? err.message : String(err)
  if (!msg.includes('does not exist') || !msg.includes('column')) return false
  if (!column) return true
  return msg.includes(column)
}

export function isMissingTableError(err: unknown, table?: string): boolean {
  const msg = err instanceof Error ? err.message : String(err)
  if (!msg.includes('schema cache') && !msg.includes('Could not find the table')) {
    return false
  }
  if (!table) return true
  return msg.includes(table)
}
