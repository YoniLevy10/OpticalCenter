/**
 * Simple in-memory sliding window rate limiter (per process).
 * Suitable for single-instance / Fluid Compute demos — not a distributed limit.
 */

type Bucket = { timestamps: number[] }

const buckets = new Map<string, Bucket>()

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { allowed: boolean; remaining: number; resetMs: number } {
  const now = Date.now()
  const cutoff = now - windowMs
  let bucket = buckets.get(key)
  if (!bucket) {
    bucket = { timestamps: [] }
    buckets.set(key, bucket)
  }
  bucket.timestamps = bucket.timestamps.filter((t) => t > cutoff)
  if (bucket.timestamps.length >= limit) {
    const oldest = bucket.timestamps[0] ?? now
    return {
      allowed: false,
      remaining: 0,
      resetMs: Math.max(0, oldest + windowMs - now),
    }
  }
  bucket.timestamps.push(now)
  return {
    allowed: true,
    remaining: Math.max(0, limit - bucket.timestamps.length),
    resetMs: windowMs,
  }
}

/** Best-effort client IP from common proxy headers. */
export function clientIpFromRequest(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim()
    if (first) return first
  }
  const real = request.headers.get('x-real-ip')?.trim()
  if (real) return real
  return 'unknown'
}
