'use client'

import { useSyncExternalStore, useCallback } from 'react'
import type { LangCode } from './languages'
import { schedule, isValidPhraseRecord, type Outcome, type PhraseRecord } from './phrase-memory'

/**
 * Learner progress, kept in localStorage.
 *
 * One store shared by every component, rather than a hook holding its own
 * useState per call site. In the app this is modelled on, the header and the
 * lesson runner each held independent copies, so finishing a lesson did not
 * update the XP badge until you navigated away and back.
 *
 * getServerSnapshot returns empty progress: reading localStorage during render
 * causes a hydration mismatch in every progress-aware component, and the fix
 * belongs here once rather than as scattered `typeof window` checks.
 */

export interface LessonResult {
  /** 0..1 */
  accuracy: number
  xp: number
  completedAt: string
}

export interface Progress {
  lessons: Record<string, LessonResult>
  /** Per-phrase memory, keyed by exact target text. See phrase-memory.ts. */
  phrases: Record<string, PhraseRecord>
  totalXP: number
  streak: number
  /** YYYY-MM-DD of the last completed lesson or review. */
  lastPlayed: string | null
}

/** Shape of stored or imported progress: saved before phrase memory existed,
 *  it has no `phrases`. */
type StoredProgress = Omit<Progress, 'phrases'> & { phrases?: Record<string, PhraseRecord> }

export const EMPTY: Progress = { lessons: {}, phrases: {}, totalXP: 0, streak: 0, lastPlayed: null }

export const XP_PER_CORRECT = 2
export const XP_PERFECT_BONUS = 5

const key = (lang: LangCode) => `desilingo:progress:${lang}`
/** Pre-rename key. Read once so existing learners don't silently lose everything. */
const legacyKey = (lang: LangCode) => `indiligo:progress:${lang}`

/**
 * Moves progress from the old namespace on first read after the rename.
 *
 * Renaming the key without this would wipe every existing learner's history --
 * the data would still be in localStorage, just under a name nothing reads.
 */
function migrateLegacy(lang: LangCode): string | null {
  try {
    const legacy = localStorage.getItem(legacyKey(lang))
    if (legacy === null) return null
    localStorage.setItem(key(lang), legacy)
    localStorage.removeItem(legacyKey(lang))
    return legacy
  } catch {
    return null
  }
}

/**
 * The learner's local calendar day, not UTC.
 *
 * toISOString() is UTC, so in IST the "day" rolled over at 05:30 local time:
 * two evening sessions could count as different days, and two consecutive
 * mornings as the same one. Streaks are a promise about the learner's calendar,
 * so they have to use it.
 */
function today(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export const localToday = today

function daysBetween(a: string, b: string): number {
  const parse = (s: string) => {
    const [y, m, d] = s.split('-').map(Number)
    return new Date(y, m - 1, d).getTime()
  }
  return Math.round((parse(b) - parse(a)) / 86_400_000)
}

/**
 * A streak that has already lapsed reads as zero.
 *
 * The reference implementation only ever recomputed the streak inside its
 * completion handler, and that handler returned early for already-completed
 * lessons -- so the streak could never advance once you had finished everything,
 * and a lapsed streak kept displaying 🔥7 indefinitely.
 */
function withDecay(p: Progress): Progress {
  if (!p.lastPlayed || p.streak === 0) return p
  const gap = daysBetween(p.lastPlayed, today())
  if (gap <= 1) return p
  return { ...p, streak: 0 }
}

function read(lang: LangCode): Progress {
  try {
    const raw = localStorage.getItem(key(lang)) ?? migrateLegacy(lang)
    if (!raw) return EMPTY
    const parsed = JSON.parse(raw) as Partial<Progress>
    return withDecay({
      lessons: parsed.lessons ?? {},
      phrases: parsed.phrases ?? {},
      totalXP: parsed.totalXP ?? 0,
      streak: parsed.streak ?? 0,
      lastPlayed: parsed.lastPlayed ?? null,
    })
  } catch {
    // Private mode, cleared storage, or corrupt JSON. Start clean rather than crash.
    return EMPTY
  }
}

// useSyncExternalStore compares snapshots by identity, so these must be cached
// or every render schedules another render.
const snapshots = new Map<LangCode, Progress>()
const listeners = new Set<() => void>()

function snapshot(lang: LangCode): Progress {
  let s = snapshots.get(lang)
  if (!s) s = read(lang)
  // Decay on every read, not only on load from storage: a session left open
  // across midnight should stop claiming a streak that has lapsed.
  const decayed = withDecay(s)
  if (decayed !== s) snapshots.set(lang, decayed)
  else if (!snapshots.has(lang)) snapshots.set(lang, s)
  return decayed
}

function commit(lang: LangCode, next: Progress) {
  snapshots.set(lang, next)
  try {
    localStorage.setItem(key(lang), JSON.stringify(next))
  } catch {
    // Storage full or blocked: keep the in-memory value so the session still works.
  }
  for (const l of listeners) l()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  const onStorage = () => { snapshots.clear(); listener() }
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', onStorage)
  }
}

export function xpFor(correct: number, total: number): number {
  const base = correct * XP_PER_CORRECT
  return correct === total && total > 0 ? base + XP_PERFECT_BONUS : base
}

/** Streak after playing on `day`: +1 the day after, 1 after a gap, unchanged
 *  on a second session the same day. Shared by lessons and reviews. */
function advanceStreak(current: Progress, day: string): number {
  if (current.lastPlayed === day) return current.streak || 1
  const gap = current.lastPlayed ? daysBetween(current.lastPlayed, day) : Infinity
  return gap === 1 ? current.streak + 1 : 1
}

export function completeLesson(lang: LangCode, lessonId: string, correct: number, total: number) {
  const current = snapshot(lang)
  const day = today()
  const accuracy = total > 0 ? correct / total : 0
  const xp = xpFor(correct, total)
  const streak = advanceStreak(current, day)

  // Replaying a lesson keeps your best result and awards only the improvement,
  // so practice is never punished but grinding the same lesson isn't a loophole.
  const previous = current.lessons[lessonId]
  const bestXp = Math.max(previous?.xp ?? 0, xp)
  const delta = bestXp - (previous?.xp ?? 0)

  // Spread first: building a fresh object here would silently drop any field
  // this function doesn't know about -- phrase memory included.
  commit(lang, {
    ...current,
    lessons: {
      ...current.lessons,
      [lessonId]: {
        accuracy: Math.max(previous?.accuracy ?? 0, accuracy),
        xp: bestXp,
        completedAt: day,
      },
    },
    totalXP: current.totalXP + delta,
    streak,
    lastPlayed: day,
  })
}

/** Record the phrases one exercise tested. One commit per exercise, even for
 *  match-pairs, so subscribers re-render once. */
export function recordPhrases(lang: LangCode, texts: string[], outcome: Outcome) {
  if (texts.length === 0) return
  const current = snapshot(lang)
  const day = today()
  const phrases = { ...current.phrases }
  for (const text of texts) phrases[text] = schedule(phrases[text], outcome, day)
  commit(lang, { ...current, phrases })
}

/**
 * A finished review. Earns XP and counts toward the streak -- it is the reason
 * to open the app on a day with no new lesson -- but no perfect bonus, so a
 * one-minute review never out-earns a lesson. Doesn't touch `lessons`.
 */
export function recordReview(lang: LangCode, correct: number) {
  const current = snapshot(lang)
  const day = today()
  commit(lang, {
    ...current,
    totalXP: current.totalXP + correct * XP_PER_CORRECT,
    streak: advanceStreak(current, day),
    lastPlayed: day,
  })
}

export function resetProgress(lang: LangCode) {
  commit(lang, EMPTY)
}

/** Progress export, so clearing browser data isn't unrecoverable. */
export function exportProgress(lang: LangCode): string {
  return JSON.stringify(snapshot(lang), null, 2)
}

/**
 * Shape check for imported backups.
 *
 * The previous version trusted whatever parsed. An object-valued `totalXP`
 * would be persisted happily and then crash React when the header tried to
 * render it -- and `importProgress` still reported success, so the learner had
 * a broken app and no idea why.
 */
function isValidProgress(v: unknown): v is StoredProgress {
  if (typeof v !== 'object' || v === null) return false
  const p = v as Record<string, unknown>

  if (typeof p.totalXP !== 'number' || !Number.isFinite(p.totalXP) || p.totalXP < 0) return false
  if (typeof p.streak !== 'number' || !Number.isFinite(p.streak) || p.streak < 0) return false
  if (p.lastPlayed !== null && typeof p.lastPlayed !== 'string') return false
  if (typeof p.lessons !== 'object' || p.lessons === null || Array.isArray(p.lessons)) return false

  for (const entry of Object.values(p.lessons as Record<string, unknown>)) {
    if (typeof entry !== 'object' || entry === null) return false
    const e = entry as Record<string, unknown>
    if (typeof e.accuracy !== 'number' || !Number.isFinite(e.accuracy)) return false
    if (typeof e.xp !== 'number' || !Number.isFinite(e.xp)) return false
    if (typeof e.completedAt !== 'string') return false
  }

  // Backups from before phrase memory have no `phrases`; that's fine. A present
  // but malformed one rejects the whole import, same as any other field.
  if (p.phrases !== undefined) {
    if (typeof p.phrases !== 'object' || p.phrases === null || Array.isArray(p.phrases)) return false
    for (const rec of Object.values(p.phrases as Record<string, unknown>)) {
      if (!isValidPhraseRecord(rec)) return false
    }
  }
  return true
}

export function importProgress(lang: LangCode, json: string): boolean {
  try {
    const parsed: unknown = JSON.parse(json)
    if (!isValidProgress(parsed)) return false
    commit(lang, {
      lessons: parsed.lessons,
      phrases: parsed.phrases ?? {},
      totalXP: parsed.totalXP,
      streak: parsed.streak,
      lastPlayed: parsed.lastPlayed,
    })
    return true
  } catch {
    return false
  }
}

export function useProgress(lang: LangCode): Progress {
  const get = useCallback(() => snapshot(lang), [lang])
  const getServer = useCallback(() => EMPTY, [])
  return useSyncExternalStore(subscribe, get, getServer)
}
