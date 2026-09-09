import type { Course, Exercise } from '@/content/schema'
import { LANGUAGE_CONFIG, type LangCode } from './languages'
import { audioKey, PACE_NORMAL, PACE_SLOW } from './audio'

export interface PhraseJob {
  key: string
  lang: LangCode
  text: string
  pace: number
  speaker: string
}

/** Every phrase in an exercise that needs audio. */
function textsOf(e: Exercise): string[] {
  return e.type === 'match-pairs' ? e.pairs.map((p) => p.target) : [e.target]
}

/**
 * Which clips a course needs.
 *
 * Slow-pace audio is derived from the exercise type rather than a hand-set flag:
 * only `speak-repeat` drills offer a slow replay, and a derived rule can't drift
 * out of sync with the content the way a manual `speak: true` would. This is also
 * the budget control — generating both paces for everything would cost roughly
 * double for no pedagogical gain.
 */
export function collectPhrases(course: Course): PhraseJob[] {
  const speaker = LANGUAGE_CONFIG[course.lang].speaker
  const seen = new Set<string>()
  const jobs: PhraseJob[] = []

  const add = (text: string, pace: number) => {
    const key = audioKey({ lang: course.lang, text, speaker, pace })
    if (seen.has(key)) return
    seen.add(key)
    jobs.push({ key, lang: course.lang, text, pace, speaker })
  }

  for (const unit of course.units) {
    for (const lesson of unit.lessons) {
      for (const ex of lesson.exercises) {
        for (const text of textsOf(ex)) add(text, PACE_NORMAL)
        if (ex.type === 'speak-repeat') add(ex.target, PACE_SLOW)
      }
    }
  }
  return jobs
}

/** Sarvam bills per character, so this is the cost estimate the dry run prints. */
export function totalChars(jobs: PhraseJob[]): number {
  return jobs.reduce((n, j) => n + j.text.length, 0)
}

/** ₹30 per 10,000 characters. */
export const RUPEES_PER_CHAR = 30 / 10_000

export function estimateRupees(jobs: PhraseJob[]): number {
  return totalChars(jobs) * RUPEES_PER_CHAR
}
