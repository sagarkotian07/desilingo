import type { LangCode } from '@/lib/languages'
import { charSim } from './similarity'
import { graphemes, wordTokens, type WordToken } from './normalize'

/**
 * Word-level alignment between what the learner was asked to say and what Sarvam
 * heard.
 *
 * This is the pedagogical payload. A single global similarity number can only say
 * "0.62"; an alignment can say "the third word came out as X", which is the
 * difference between feedback a learner can act on and a score they resent.
 */

export type AlignOp = 'match' | 'substitute' | 'delete' | 'insert'

export interface WordJudgement {
  /** null when the learner said a word that isn't in the target at all. */
  target: string | null
  /** null when a target word wasn't heard. */
  heard: string | null
  op: AlignOp
  /** 0..1 similarity for substitutions; 1 for a match, 0 otherwise. */
  score: number
}

/** A word scoring at or above this is treated as correct. */
const MATCH_THRESHOLD = 0.9

/**
 * Levenshtein over token arrays where substitution cost is `1 - charSim`, so a
 * near-identical word aligns to its counterpart instead of degenerating into a
 * delete plus an insert (which would lose the very information we want).
 */
export function alignWords(target: WordToken[], heard: WordToken[], lang: LangCode): WordJudgement[] {
  const n = target.length
  const m = heard.length

  const sim: number[][] = Array.from({ length: n }, (_, i) =>
    Array.from({ length: m }, (_, j) => charSim(target[i].compare, heard[j].compare, lang)),
  )

  const d: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0))
  for (let i = 0; i <= n; i++) d[i][0] = i
  for (let j = 0; j <= m; j++) d[0][j] = j
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      d[i][j] = Math.min(
        d[i - 1][j] + 1,               // target word not heard
        d[i][j - 1] + 1,               // extra word heard
        d[i - 1][j - 1] + (1 - sim[i - 1][j - 1]),
      )
    }
  }

  const out: WordJudgement[] = []
  let i = n
  let j = m
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0) {
      const s = sim[i - 1][j - 1]
      if (Math.abs(d[i][j] - (d[i - 1][j - 1] + (1 - s))) < 1e-9) {
        out.push({
          target: target[i - 1].display,
          heard: heard[j - 1].display,
          op: s >= MATCH_THRESHOLD ? 'match' : 'substitute',
          score: s,
        })
        i--; j--
        continue
      }
    }
    if (i > 0 && Math.abs(d[i][j] - (d[i - 1][j] + 1)) < 1e-9) {
      out.push({ target: target[i - 1].display, heard: null, op: 'delete', score: 0 })
      i--
      continue
    }
    out.push({ target: null, heard: heard[j - 1].display, op: 'insert', score: 0 })
    j--
  }
  return out.reverse()
}

/** Extra words the STT hallucinated shouldn't sink an otherwise correct attempt,
 *  so the insertion penalty is capped. */
const MAX_INSERT_PENALTY = 0.15
const INSERT_PENALTY_EACH = 0.05

/** Length-weighted mean of per-word scores: longer words carry more weight. */
export function overallScore(judgements: WordJudgement[], lang: LangCode): number {
  let weighted = 0
  let total = 0
  let inserts = 0

  for (const j of judgements) {
    if (j.target === null) { inserts++; continue }
    const w = Math.max(1, graphemes(j.target, lang).length)
    weighted += w * j.score
    total += w
  }
  if (total === 0) return 0

  const penalty = Math.min(MAX_INSERT_PENALTY, inserts * INSERT_PENALTY_EACH)
  return Math.max(0, (weighted / total) * (1 - penalty))
}

/** Convenience: align two raw strings and return both the judgements and score. */
export function alignStrings(target: string, heard: string, lang: LangCode) {
  const judgements = alignWords(wordTokens(target, lang), wordTokens(heard, lang), lang)
  return { judgements, score: overallScore(judgements, lang) }
}
