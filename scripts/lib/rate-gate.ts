/**
 * Request pacing for the audio generator.
 *
 * A spacing gate rather than a token bucket. A bucket lets the first N requests
 * fire instantly and then stalls, and if the provider's window is sliding rather
 * than fixed you hit a 429 wall at request N+1 and again at every subsequent
 * boundary. Spacing every request evenly is smoother and trivially correct.
 */

export interface RateGate {
  run<T>(fn: () => Promise<T>): Promise<T>
  /** Push the shared cursor forward, backing off every in-flight worker rather
   *  than only the one that happened to receive the 429. */
  penalize(ms: number): void
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export function createRateGate(opts: { minIntervalMs: number; concurrency: number }): RateGate {
  const { minIntervalMs, concurrency } = opts
  let nextSlotAt = 0
  let active = 0
  const waiting: Array<() => void> = []

  async function acquire(): Promise<void> {
    if (active >= concurrency) {
      await new Promise<void>((resolve) => waiting.push(resolve))
    }
    active++
  }

  function release(): void {
    active--
    waiting.shift()?.()
  }

  return {
    penalize(ms: number) {
      nextSlotAt = Math.max(nextSlotAt, Date.now() + ms)
    },

    async run<T>(fn: () => Promise<T>): Promise<T> {
      await acquire()
      try {
        const now = Date.now()
        const slot = Math.max(now, nextSlotAt)
        nextSlotAt = slot + minIntervalMs
        if (slot > now) await sleep(slot - now)
        return await fn()
      } finally {
        release()
      }
    },
  }
}
