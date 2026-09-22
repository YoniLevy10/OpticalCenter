/**
 * Fixly marketplace backup — intentionally OFF for the Optical Center pilot.
 * Preferred vendor pool is the primary dispatch path. Flip FIXLY_ENABLED=1
 * only when Partner API credentials and product decision are ready.
 */
export function isFixlyEnabled(): boolean {
  const raw = (process.env.FIXLY_ENABLED ?? '').trim().toLowerCase()
  return raw === '1' || raw === 'true' || raw === 'yes'
}

export function fixlyStatusLabelHe(): string {
  return isFixlyEnabled()
    ? 'Fixly פעיל כגיבוי'
    : 'Fixly כבוי — מאגר ספקים מועדפים בלבד'
}
