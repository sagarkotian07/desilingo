import type { Course, Exercise } from '@/content/schema'
import { LANGUAGE_CONFIG, type LangCode } from './languages'
import { PACE_NORMAL, PACE_SLOW } from './audio'
import { audioKey } from './audio-key'

export interface PhraseJob {
  key: string
  lang: LangCode
  text: string
  pace: number
  speaker: string
}

/**
 * Every phrase an exercise can play.
 *
 * This must cover what the UI can actually request, not just the headline
 * phrase. select-phrase plays whichever option you tap -- including the wrong
 * ones -- so 13 decoys across the six courses were silently soundless.
 */
function textsOf(e: Exercise): string[] {
  if (e.type === 'match-pairs') return e.pairs.map((p) => p.target)
  // A scene's other speaker. Normal pace only: it's heard, never drilled.
  const lead = e.lead ? [e.lead.text] : []
  if (e.type === 'select-phrase') return [...lead, e.target, ...e.options.map((o) => o.text)]
  return [...lead, e.target]
}

/** Exercises that offer a slow replay, and therefore need a 0.75-pace clip.
 *  A type predicate so the caller keeps access to `target`. */
function needsSlow(e: Exercise): e is Extract<Exercise, { type: 'speak-repeat' | 'listen-type-roman' }> {
  return e.type === 'speak-repeat' || e.type === 'listen-type-roman'
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
        if (needsSlow(ex)) add(ex.target, PACE_SLOW)
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
