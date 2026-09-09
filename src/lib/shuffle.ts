/**
 * Deterministic-per-session option shuffling.
 *
 * The app this is modelled on authored the correct answer first in all 75 of its
 * multiple-choice questions and never shuffled, so every question was solvable by
 * tapping the top-left box without reading it. Shuffling is therefore not a
 * nicety here, it is the difference between a quiz and a decoration.
 *
 * The seed combines a per-session salt with the exercise id: stable across
 * re-renders (so options don't jump while you're reading them) but different on
 * a later attempt (so you learn the phrase, not the position).
 */

const SESSION_SALT = Math.floor(Math.random() * 0xffffffff)

function hashString(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** mulberry32 — small, fast, good enough for shuffling four options. */
function rng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function seededShuffle<T>(items: readonly T[], seed: string): T[] {
  const next = rng(hashString(seed) ^ SESSION_SALT)
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/** Shuffles options while tracking where the correct one landed. */
export function shuffleOptions<T>(options: readonly T[], answer: number, seed: string) {
  const indexed = options.map((option, i) => ({ option, i }))
  const shuffled = seededShuffle(indexed, seed)
  return {
    options: shuffled.map((x) => x.option),
    answer: shuffled.findIndex((x) => x.i === answer),
  }
}
