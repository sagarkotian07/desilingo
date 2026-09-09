/**
 * Comparing typed romanization.
 *
 * Roman spelling of Indic words has no single correct form -- nahin, nahi and
 * nahee are all reasonable attempts at नहीं -- so this is deliberately generous.
 * The exercise is testing whether the learner heard the word, not whether they
 * guessed our transliteration convention.
 */

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')  // strip accents
    .replace(/[^a-z0-9]/g, '')
    // Common interchangeable spellings, folded to one form.
    .replace(/aa+/g, 'a').replace(/ee+/g, 'i').replace(/ii+/g, 'i')
    .replace(/oo+/g, 'u').replace(/uu+/g, 'u')
    .replace(/ph/g, 'f').replace(/v/g, 'w')
    .replace(/(.)\1+/g, '$1')                          // collapse doubles
    .replace(/[mn]$/, 'n')                             // final nasal
}

function distance(a: string, b: string): number {
  if (a === b) return 0
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const curr = [i]
    for (let j = 1; j <= b.length; j++) {
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    }
    prev = curr
  }
  return prev[b.length]
}

export function romanMatches(typed: string, expected: string): boolean {
  const a = normalize(typed)
  const b = normalize(expected)
  if (!a) return false
  if (a === b) return true
  // One slip per five characters, and always at least one.
  return distance(a, b) <= Math.max(1, Math.floor(b.length / 5))
}
