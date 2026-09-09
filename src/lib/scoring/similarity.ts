import { LANGUAGE_CONFIG, type LangCode } from '@/lib/languages'
import { graphemes } from './normalize'

/**
 * Weighted edit distance for Indic text.
 *
 * The point of the weights: the confusions below are the ones Sarvam's STT makes
 * itself, so charging a learner full price for them means punishing them for the
 * model's error. They are also *partially correct* pronunciations, so partial
 * credit is pedagogically honest. Crucially we weight rather than fold these,
 * which keeps us able to say "you said the dental one" instead of silently
 * accepting it.
 *
 * Costs are defined once on Devanagari offsets and derived for the other scripts
 * by offset arithmetic (see normalize.ts).
 */

/** Stop series: unvoiced, unvoiced-aspirated, voiced, voiced-aspirated, nasal. */
const SERIES_STARTS = [0x15, 0x1a, 0x1f, 0x24, 0x2a] // ka, ca, Ta, ta, pa
const RETROFLEX = 0x1f
const DENTAL = 0x24
const SIBILANTS = [0x36, 0x37, 0x38] // श ष स
/** Long/short vowel pairs, independent letters and matras alike. */
const LENGTH_PAIRS: ReadonlyArray<readonly [number, number]> = [
  [0x05, 0x06], [0x07, 0x08], [0x09, 0x0a], [0x0f, 0x10], [0x13, 0x14],
  [0x3f, 0x40], [0x41, 0x42], [0x47, 0x48], [0x4b, 0x4c],
  // Dravidian short/long e and o, absent from Devanagari.
  [0x46, 0x47], [0x4a, 0x4b], [0x0e, 0x0f], [0x12, 0x13],
]

export const COST = {
  identical: 0,
  sibilant: 0.3,
  vowelLength: 0.35,
  aspiration: 0.4,
  retroflexDental: 0.5,
  voicing: 0.6,
  unrelated: 1,
} as const

function seriesOf(o: number): number | null {
  for (const s of SERIES_STARTS) if (o >= s && o <= s + 4) return s
  return null
}

/** Cost of substituting one code point for another, within one script. */
function codePointCost(a: string, b: string, base: number): number {
  if (a === b) return COST.identical
  const oa = a.codePointAt(0)! - base
  const ob = b.codePointAt(0)! - base
  if (oa < 0 || ob < 0 || oa > 0x7f || ob > 0x7f) return COST.unrelated

  for (const [lo, hi] of LENGTH_PAIRS) {
    if ((oa === lo && ob === hi) || (oa === hi && ob === lo)) return COST.vowelLength
  }
  if (SIBILANTS.includes(oa) && SIBILANTS.includes(ob)) return COST.sibilant

  const sa = seriesOf(oa)
  const sb = seriesOf(ob)
  if (sa === null || sb === null) return COST.unrelated
  const pa = oa - sa
  const pb = ob - sb

  if (sa === sb) {
    // Same place of articulation: differ by aspiration, voicing, or both.
    if (pa === 4 || pb === 4) return COST.unrelated // nasal vs stop
    const aspirationOnly = Math.abs(pa - pb) === 1 && Math.min(pa, pb) % 2 === 0
    if (aspirationOnly) return COST.aspiration
    if (Math.abs(pa - pb) === 2) return COST.voicing
    return COST.unrelated
  }
  // Different place: retroflex vs dental at the same position in the series.
  const crossRetroflexDental =
    (sa === RETROFLEX && sb === DENTAL) || (sa === DENTAL && sb === RETROFLEX)
  if (crossRetroflexDental && pa === pb) return COST.retroflexDental
  return COST.unrelated
}

/**
 * Generic weighted Levenshtein with weighted insertions and deletions.
 *
 * Weighting indels matters as much as weighting substitutions here. Dropping the
 * anusvara from नहीं is a nasalization difference; substituting प for ठ is a
 * different word. Charging both a flat 1.0 made them score identically (0.500),
 * which left no threshold that could accept the first and reject the second.
 */
export function weightedDistance<T>(
  a: readonly T[],
  b: readonly T[],
  subCost: (x: T, y: T) => number,
  indelCost: (x: T) => number = () => 1,
): number {
  const n = a.length
  const m = b.length
  if (n === 0) return b.reduce((t, x) => t + indelCost(x), 0)
  if (m === 0) return a.reduce((t, x) => t + indelCost(x), 0)

  let prev = new Array<number>(m + 1)
  prev[0] = 0
  for (let j = 1; j <= m; j++) prev[j] = prev[j - 1] + indelCost(b[j - 1])

  const curr = new Array<number>(m + 1)
  for (let i = 1; i <= n; i++) {
    curr[0] = prev[0] + indelCost(a[i - 1])
    for (let j = 1; j <= m; j++) {
      curr[j] = Math.min(
        prev[j] + indelCost(a[i - 1]),
        curr[j - 1] + indelCost(b[j - 1]),
        prev[j - 1] + subCost(a[i - 1], b[j - 1]),
      )
    }
    prev = curr.slice()
  }
  return prev[m]
}

/** Combining marks -- matras, anusvara, candrabindu, nukta, virama -- modify a
 *  syllable rather than replacing it, so adding or losing one is a small error. */
const MARK_INDEL = 0.35

function isCombiningMark(o: number): boolean {
  return o === 0x01 || o === 0x02 || o === 0x03 || o === 0x3c ||
         (o >= 0x3e && o <= 0x4d)
}

function codePointIndel(c: string, base: number): number {
  const o = c.codePointAt(0)! - base
  return isCombiningMark(o) ? MARK_INDEL : 1
}

/**
 * Similarity between two grapheme clusters, 0..1.
 *
 * A cluster can be several code points (स्ते), so cluster substitution cost is
 * itself a normalized weighted distance over the code points inside it.
 */
function isConsonant(c: string, base: number): boolean {
  const o = c.codePointAt(0)! - base
  return o >= 0x15 && o <= 0x39
}

function clusterCost(a: string, b: string, base: number): number {
  if (a === b) return 0
  const ca = [...a]
  const cb = [...b]
  const d = weightedDistance(ca, cb, (x, y) => codePointCost(x, y, base), (x) => codePointIndel(x, base))
  // Normalize by consonant count, not total code points. A cluster's identity is
  // carried by its consonants; dividing by the full length lets a matching vowel
  // sign halve the penalty for a wrong consonant, so ठीक heard as पीक scored 0.86
  // and passed. Matra-only differences still cost little because their own
  // substitution cost is low.
  const consonants = Math.max(
    ca.filter((c) => isConsonant(c, base)).length,
    cb.filter((c) => isConsonant(c, base)).length,
  )
  return Math.min(1, d / Math.max(1, consonants))
}

/**
 * Similarity of two strings, 0..1, over grapheme clusters.
 *
 * Deliberately not a Dice bigram coefficient, which is what the app this is
 * modelled on used. नमस्ते is three clusters, so it yields two bigrams; one wrong
 * cluster destroys both and scores ~0.33 on a near-perfect attempt. On a beginner
 * app where half the targets are one or two words, that is the dominant source of
 * false negatives — telling people who said it right that they got it wrong.
 */
export function charSim(a: string, b: string, lang: LangCode): number {
  if (a === b) return 1
  const base = LANGUAGE_CONFIG[lang].scriptBase
  const ga = graphemes(a, lang)
  const gb = graphemes(b, lang)
  const max = Math.max(ga.length, gb.length)
  if (max === 0) return 1
  const d = weightedDistance(ga, gb, (x, y) => clusterCost(x, y, base))
  return Math.max(0, 1 - d / max)
}

/** Weighted edit distance in grapheme units — used by the length-adaptive pass
 *  gate, where a ratio alone behaves badly on very short targets. */
export function graphemeDistance(a: string, b: string, lang: LangCode): number {
  const base = LANGUAGE_CONFIG[lang].scriptBase
  return weightedDistance(graphemes(a, lang), graphemes(b, lang), (x, y) => clusterCost(x, y, base))
}
