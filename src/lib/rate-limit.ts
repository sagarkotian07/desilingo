/**
 * Per-IP request throttle.
 *
 * Defence in depth only, and worth being honest about its limits: counters live
 * in module scope, so they are per function instance. Fluid Compute reuses
 * instances but also spawns many of them, which means a determined or
 * distributed caller routes around this. The load-bearing control is the Vercel
 * WAF rate-limit rule on /api/stt (see README) -- requests it blocks never reach
 * a function and are never billed.
 *
 * This exists to stop one careless client hammering one warm instance.
 */

const buckets = new Map<string, number[]>()

export interface RateLimitResult {
  ok: boolean
  retryAfterSeconds: number
}

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now()
  const cutoff = now - windowMs
  const hits = (buckets.get(key) ?? []).filter((t) => t > cutoff)

  if (hits.length >= limit) {
    const retryAfterSeconds = Math.max(1, Math.ceil((hits[0] + windowMs - now) / 1000))
    buckets.set(key, hits)
    return { ok: false, retryAfterSeconds }
  }

  hits.push(now)
  buckets.set(key, hits)

  // Opportunistic cleanup so the map can't grow without bound.
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) {
      if (!v.some((t) => t > cutoff)) buckets.delete(k)
    }
  }
  return { ok: true, retryAfterSeconds: 0 }
}

/** Best-effort client address. Vercel sets x-forwarded-for. */
export function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0].trim()
  return req.headers.get('x-real-ip') ?? 'unknown'
}

/**
 * Whether a request plausibly came from our own pages.
 *
 * Still spoofable by anything that sets headers deliberately, so this is a
 * filter rather than a security boundary -- but it now rejects the default
 * curl/script case instead of welcoming it. The previous version treated a
 * MISSING Sec-Fetch-Site as same-origin, which is exactly what a bare curl
 * sends, so the check passed for the traffic it was meant to stop.
 */
export function isSameOrigin(req: Request): boolean {
  const origin = req.headers.get('origin')
  const host = req.headers.get('host')

  // Browsers send Origin on cross-origin requests and on same-origin non-GET
  // fetches, so when it is present it is the strongest signal we have.
  if (origin) {
    try {
      return new URL(origin).host === host
    } catch {
      return false
    }
  }

  // No Origin: require the browser to vouch for it explicitly.
  return req.headers.get('sec-fetch-site') === 'same-origin'
}
