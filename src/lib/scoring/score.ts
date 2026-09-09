import { LANGUAGE_CONFIG, type LangCode } from '@/lib/languages'
import { alignWords, overallScore, type WordJudgement } from './align'
import { graphemeDistance, weightedDistance } from './similarity'
import { graphemes, wordTokens, normalizeIndic } from './normalize'
import { phonemize } from './phonemize'

export type Verdict =
  | 'perfect' | 'good' | 'close' | 'retry' | 'try-again'
  | 'not-heard' | 'wrong-language'

export interface PronunciationResult {
  verdict: Verdict
  /** max(orthographic, phonetic) — the score the bands are read off. */
  score: number
  orthographicScore: number
  phoneticScore: number
  words: WordJudgement[]
  /** What Sarvam heard, cleaned for display. Always shown to the learner. */
  heardTranscript: string
  /** Whether this counts as said-correctly. Never blocks progression. */
  passed: boolean
}

export interface ScoreInput {
  target: string
  transcript: string
  lang: LangCode
  /** Sarvam returns the language it detected; a mismatch is its own verdict. */
  detectedLanguage?: string
  /** Peak amplitude measured in the browser, 0..1. Distinguishes silence from a
   *  wrong answer — we must never tell someone they're wrong when the mic was
   *  muted. */
  rmsPeak?: number
}

/** Below this the recording is treated as silence, not as an attempt. */
const SILENCE_FLOOR = 0.012
/** A transcript this much shorter than the target means the mic caught a
 *  fragment rather than an attempt. Deliberately low: dropping one word of two
 *  is a real attempt and deserves a word diff, not "check your mic". */
const TRUNCATED_RATIO = 0.25
/** Any target word scoring below this is simply not the word that was asked for.
 *  Without this rule the length-weighted mean lets a wholly wrong word pass when
 *  the rest of the phrase matched -- saying "yes" for "no" scored 0.73 and passed. */
const WORD_FLOOR = 0.4

const BANDS: ReadonlyArray<readonly [number, Verdict]> = [
  [0.92, 'perfect'],
  [0.8, 'good'],
  [0.7, 'close'],
  [0.5, 'retry'],
]

/** Flat-cost similarity over phoneme tokens (they're Latin, so the Indic
 *  substitution matrix doesn't apply). */
function phonemeSim(a: string, b: string): number {
  const ta = a.split(' ').filter(Boolean)
  const tb = b.split(' ').filter(Boolean)
  const max = Math.max(ta.length, tb.length)
  if (max === 0) return 1
  const d = weightedDistance(ta, tb, (x, y) => (x === y ? 0 : 1))
  return Math.max(0, 1 - d / max)
}

/**
 * Score a spoken attempt.
 *
 * The governing principle is that false negatives are far more costly than false
 * positives. A learner who said it correctly and is told they were wrong will
 * conclude the app is broken and stop; a learner who slips through on a near-miss
 * loses very little. So the gate is deliberately forgiving, `close` still passes,
 * and inability to hear is reported as such rather than scored as an error.
 */
export function scorePronunciation(input: ScoreInput): PronunciationResult {
  const { target, transcript, lang, detectedLanguage, rmsPeak } = input
  const heardDisplay = normalizeIndic(transcript, lang, 'display')

  const targetWords = wordTokens(target, lang)
  const heardWords = wordTokens(transcript, lang)
  const targetLen = graphemes(target, lang).length
  const heardLen = graphemes(transcript, lang).length

  const silent = rmsPeak !== undefined && rmsPeak < SILENCE_FLOOR
  const empty = heardWords.length === 0
  const truncated = targetLen > 0 && heardLen < TRUNCATED_RATIO * targetLen

  if (silent || empty || truncated) {
    return {
      verdict: 'not-heard', score: 0, orthographicScore: 0, phoneticScore: 0,
      words: targetWords.map((w) => ({ target: w.display, heard: null, op: 'delete' as const, score: 0 })),
      heardTranscript: heardDisplay, passed: false,
    }
  }

  const orthAlign = alignWords(targetWords, heardWords, lang)
  const orthographicScore = overallScore(orthAlign, lang)
  const phoneticScore = phonemeSim(phonemize(target, lang), phonemize(transcript, lang))
  const score = Math.max(orthographicScore, phoneticScore)

  // Language mismatch only counts when the attempt also scored poorly: Sarvam
  // sometimes tags a short correct utterance with the wrong language, and we
  // would rather accept it than reject a learner who was right.
  const expected = LANGUAGE_CONFIG[lang].sarvam
  if (detectedLanguage && detectedLanguage !== expected && score < 0.5) {
    return {
      verdict: 'wrong-language', score, orthographicScore, phoneticScore,
      words: orthAlign, heardTranscript: heardDisplay, passed: false,
    }
  }

  // Length-adaptive gate. A pure ratio behaves badly on very short targets: a
  // four-cluster word with one wrong cluster is a good attempt, but a fixed
  // threshold can fail it. Allowing a small absolute number of edits fixes that.
  const allowedEdits = Math.max(1, Math.ceil(0.25 * targetLen))
  const distance = graphemeDistance(target, transcript, lang)

  // A missing or wholly wrong word blocks the pass however well the rest scored.
  const hasUnsaidWord = orthAlign.some((j) => j.target !== null && j.score < WORD_FLOOR)
  const passed = !hasUnsaidWord && (score >= 0.7 || distance <= allowedEdits)

  let verdict: Verdict = 'try-again'
  for (const [floor, v] of BANDS) {
    if (score >= floor) { verdict = v; break }
  }
  if (hasUnsaidWord && (verdict === 'perfect' || verdict === 'good' || verdict === 'close')) {
    verdict = 'retry'
  }
  // A short attempt that passed on the edit allowance shouldn't read as a failure.
  if (passed && (verdict === 'retry' || verdict === 'try-again')) verdict = 'close'

  return { verdict, score, orthographicScore, phoneticScore, words: orthAlign, heardTranscript: heardDisplay, passed }
}
