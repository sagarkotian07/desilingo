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

/** Generic weighted Levenshtein. Returns distance in cost units. */
export function weightedDistance<T>(
  a: readonly T[],
  b: readonly T[],
  subCost: (x: T, y: T) => number,
): number {
  if (a.length === 0) return b.length
  if (b.length === 0) return a.length
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j)
  const curr = new Array<number>(b.length + 1)
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i
    for (let j = 1; j <= b.length; j++) {
      curr[j] = Math.min(
        prev[j] + 1,
        curr[j - 1] + 1,
        prev[j - 1] + subCost(a[i - 1], b[j - 1]),
      )
    }
    prev = curr.slice()
  }
  return prev[b.length]
}

/**
 * Similarity between two grapheme clusters, 0..1.
 *
 * A cluster can be several code points (स्ते), so cluster substitution cost is
 * itself a normalized weighted distance over the code points inside it.
 */
function clusterCost(a: string, b: string, base: number): number {
  if (a === b) return 0
  const ca = [...a]
  const cb = [...b]
  const d = weightedDistance(ca, cb, (x, y) => codePointCost(x, y, base))
  return Math.min(1, d / Math.max(ca.length, cb.length))
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
