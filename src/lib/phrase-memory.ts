import type { Course, Exercise, Lesson } from '@/content/schema'
import { seededShuffle } from './shuffle'

/**
 * What the app remembers about each phrase, and when to ask about it again.
 *
 * A Leitner ladder rather than SM-2. SM-2 wants a 0-5 quality grade per answer;
 * we have a boolean for five of the six exercise types, and the one numeric
 * score we do have (pronunciation) is muddied by the speech model's own
 * mistakes. Integer boxes are honest about the signal and explainable in a
 * sentence: get it right and it waits longer, miss it and it starts over.
 *
 * Pure -- no React, no storage. progress.ts owns persistence.
 */

export interface PhraseRecord {
  /** 0..MAX_BOX. Higher means better known, asked about less often. */
  box: number
  /** Local YYYY-MM-DD. Due for review when due <= today. */
  due: string
  lastSeen: string
  seen: number
  misses: number
}

/** hit: answered right. miss: answered wrong or skipped. seen: encountered,
 *  but the result isn't evidence either way (see outcomeFor). */
export type Outcome = 'hit' | 'miss' | 'seen'

export const MAX_BOX = 6
/** Days to wait after landing in each box. */
export const INTERVAL_DAYS = [1, 1, 2, 4, 8, 16, 32] as const
export const REVIEW_SIZE = 5

const DATE = /^\d{4}-\d{2}-\d{2}$/

/** Local calendar arithmetic on YYYY-MM-DD strings. */
export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split('-').map(Number)
  const next = new Date(y, m - 1, d + n)
  const pad = (v: number) => String(v).padStart(2, '0')
  return `${next.getFullYear()}-${pad(next.getMonth() + 1)}-${pad(next.getDate())}`
}

export function schedule(prev: PhraseRecord | undefined, outcome: Outcome, today: string): PhraseRecord {
  const seen = (prev?.seen ?? 0) + 1
  const misses = prev?.misses ?? 0

  if (outcome === 'miss') {
    // Back to the bottom, due tomorrow rather than today: Review should never
    // offer a phrase whose answer the learner saw a minute ago.
    return { box: 0, due: addDays(today, 1), lastSeen: today, seen, misses: misses + 1 }
  }

  if (outcome === 'seen') {
    if (!prev) return { box: 0, due: addDays(today, 1), lastSeen: today, seen, misses }
    return { ...prev, lastSeen: today, seen }
  }

  // One promotion per day. A lesson shows the same phrase two or three times;
  // without this it would climb three boxes in ten minutes and vanish for a week.
  if (prev && prev.lastSeen === today) return { ...prev, seen }

  const box = prev ? Math.min(prev.box + 1, MAX_BOX) : 1
  return { box, due: addDays(today, INTERVAL_DAYS[box]), lastSeen: today, seen, misses }
}

/** The phrases an exercise tests. Decoys and scene lines spoken by the other
 *  person are never included -- the learner didn't produce them. */
export function phrasesOf(ex: Exercise): string[] {
  return ex.type === 'match-pairs' ? ex.pairs.map((p) => p.target) : [ex.target]
}

export function outcomeFor(ex: Exercise, correct: boolean): Outcome {
  if (correct) return 'hit'
  // A failed pronunciation attempt is as likely to be the speech model's
  // mistake, or a muted mic, as the learner's. A slip in match-pairs can't be
  // pinned to one pair. Neither is evidence a particular phrase was forgotten.
  if (ex.type === 'speak-repeat' || ex.type === 'match-pairs') return 'seen'
  return 'miss'
}

export function isValidPhraseRecord(v: unknown): v is PhraseRecord {
  if (typeof v !== 'object' || v === null) return false
  const r = v as Record<string, unknown>
  const count = (n: unknown) => typeof n === 'number' && Number.isFinite(n) && n >= 0
  return (
    Number.isInteger(r.box) && (r.box as number) >= 0 && (r.box as number) <= MAX_BOX &&
    typeof r.due === 'string' && DATE.test(r.due) &&
    typeof r.lastSeen === 'string' && DATE.test(r.lastSeen) &&
    count(r.seen) && count(r.misses)
  )
}

/** Due phrases, most fragile first. `known` drops phrases a content edit removed. */
export function selectDue(
  phrases: Record<string, PhraseRecord>,
  known: ReadonlySet<string>,
  today: string,
  limit = REVIEW_SIZE,
): Array<[string, PhraseRecord]> {
  return Object.entries(phrases)
    .filter(([text, rec]) => rec.due <= today && known.has(text))
    .sort(([ta, a], [tb, b]) =>
      a.box - b.box ||
      a.due.localeCompare(b.due) ||
      b.misses - a.misses ||
      a.lastSeen.localeCompare(b.lastSeen) ||
      ta.localeCompare(tb))
    .slice(0, limit)
}

// ---- Review lessons ----------------------------------------------------------

type Reviewable = Extract<Exercise, { type: 'listen-choose' | 'select-phrase' | 'word-order' }>
type ListenChooseEx = Extract<Exercise, { type: 'listen-choose' }>

/**
 * Review is fast and free: recognition and building, never speaking (it costs
 * per attempt and a failed attempt isn't evidence), never typing (slow on a
 * phone), never matching (one result for several phrases).
 */
function isReviewable(ex: Exercise): ex is Reviewable {
  return ex.type === 'listen-choose' || ex.type === 'select-phrase' || ex.type === 'word-order'
}

export interface PoolEntry {
  text: string
  romanized: string
  english: string
  exercises: Reviewable[]
}
export type ReviewPool = Record<string, PoolEntry>

/** Every phrase the course can record, with the exercises that can review it. */
export function buildReviewPool(course: Course): ReviewPool {
  const pool: ReviewPool = {}
  const ensure = (text: string, romanized: string, english: string) =>
    (pool[text] ??= { text, romanized, english, exercises: [] })

  for (const unit of course.units) {
    for (const lesson of unit.lessons) {
      for (const ex of lesson.exercises) {
        if (ex.type === 'match-pairs') {
          for (const p of ex.pairs) ensure(p.target, p.romanized, p.english)
          continue
        }
        const entry = ensure(ex.target, ex.romanized, ex.english)
        if (isReviewable(ex)) entry.exercises.push(ex)
      }
    }
  }
  return pool
}

/** Fragile phrases get recognition first; known ones get asked to build it. */
const RECOGNITION = ['listen-choose', 'select-phrase', 'word-order'] as const
const PRODUCTION = ['word-order', 'select-phrase', 'listen-choose'] as const

/**
 * Some phrases only ever appear in speaking or matching drills (Hindi शुक्रिया,
 * for one), so there is nothing authored to review them with. Build a plain
 * "what does this mean?" from the rest of the course.
 */
function synthesizeListenChoose(entry: PoolEntry, pool: ReviewPool, seed: string): ListenChooseEx {
  const others = [...new Set(Object.values(pool).map((e) => e.english))].filter((e) => e !== entry.english)
  return {
    id: 'synthetic',
    type: 'listen-choose',
    target: entry.text,
    romanized: entry.romanized,
    english: entry.english,
    options: [entry.english, ...seededShuffle(others, seed).slice(0, 3)],
    answer: 0,
  }
}

/** Up to REVIEW_SIZE due phrases as a runnable lesson, or null if none are due. */
export function buildReviewLesson(
  pool: ReviewPool,
  phrases: Record<string, PhraseRecord>,
  today: string,
  limit = REVIEW_SIZE,
): Lesson | null {
  const picks = selectDue(phrases, new Set(Object.keys(pool)), today, limit)
  if (picks.length === 0) return null

  const exercises = picks.map(([text, rec], i): Exercise => {
    const entry = pool[text]
    const order = rec.box <= 1 ? RECOGNITION : PRODUCTION
    const authored = order
      .map((type) => entry.exercises.find((e) => e.type === type))
      .find((e): e is Reviewable => e !== undefined)
    const ex = authored ?? synthesizeListenChoose(entry, pool, `${today}|${text}`)
    // Authored ids are e1..e6 and repeat in every lesson; the runner keys
    // results by id, so borrowed exercises must be renamed. A turn borrowed
    // from a scene leaves the other speaker behind: out of the scene, their
    // line is context without a conversation.
    return { ...ex, id: `r${i}`, lead: undefined }
  })

  return { id: 'review', title: 'Review', exercises }
}
