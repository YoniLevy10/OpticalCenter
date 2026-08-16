/**
 * Shared by both server and client components, so it must NOT live in a
 * 'use client' module — server components cannot call client functions.
 */
export function techHref(path: string, techId?: string | null): string {
  if (!techId) return path
  const sep = path.includes('?') ? '&' : '?'
  return `${path}${sep}techId=${encodeURIComponent(techId)}`
}
