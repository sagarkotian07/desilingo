import { describe, it, expect, beforeEach, vi } from 'vitest'

class MemoryStorage {
  private m = new Map<string, string>()
  getItem(k: string) { return this.m.get(k) ?? null }
  setItem(k: string, v: string) { this.m.set(k, v) }
  removeItem(k: string) { this.m.delete(k) }
  clear() { this.m.clear() }
  key() { return null }
  get length() { return this.m.size }
}

const storage = new MemoryStorage()
vi.stubGlobal('localStorage', storage)
vi.stubGlobal('window', { addEventListener() {}, removeEventListener() {} })

const {
  completeLesson, recordPhrases, recordReview, resetProgress, exportProgress, importProgress,
  xpFor, XP_PERFECT_BONUS,
} = await import('@/lib/progress')

function read(lang: 'hi' | 'kn' = 'hi') {
  return JSON.parse(exportProgress(lang))
}

/** Local calendar date N days ago. Must match the store, which switched from
 *  UTC to local days so streaks follow the learner's calendar. */
const iso = (daysAgo: number) => {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

describe('xpFor', () => {
  it('scales with correct answers', () => {
    expect(xpFor(0, 5)).toBe(0)
    expect(xpFor(3, 5)).toBe(6)
  })
  it('adds a bonus only for a clean run', () => {
    expect(xpFor(5, 5)).toBe(10 + XP_PERFECT_BONUS)
  })
  // The reference app awarded a flat 10 XP on completion no matter how many
  // answers were wrong, because the handler discarded the correctness flag.
  it('awards nothing for a lesson answered entirely wrong', () => {
    expect(xpFor(0, 6)).toBe(0)
  })
})

describe('progress store', () => {
  beforeEach(() => { storage.clear(); resetProgress('hi'); resetProgress('kn') })

  it('records a completed lesson and accumulates XP', () => {
    completeLesson('hi', 'lesson-1-1', 4, 6)
    const p = read()
    expect(p.totalXP).toBe(8)
    expect(p.lessons['lesson-1-1'].accuracy).toBeCloseTo(4 / 6)
  })

  it('keeps the best result on a replay and only awards the improvement', () => {
    completeLesson('hi', 'lesson-1-1', 3, 6)   // 6 xp
    completeLesson('hi', 'lesson-1-1', 6, 6)   // best now 17
    expect(read().totalXP).toBe(17)
    completeLesson('hi', 'lesson-1-1', 1, 6)   // worse, no change
    expect(read().totalXP).toBe(17)
    expect(read().lessons['lesson-1-1'].xp).toBe(17)
  })

  it('starts a streak at one', () => {
    completeLesson('hi', 'lesson-1-1', 5, 6)
    expect(read().streak).toBe(1)
  })

  it('does not double-count two lessons on the same day', () => {
    completeLesson('hi', 'lesson-1-1', 5, 6)
    completeLesson('hi', 'lesson-1-2', 5, 6)
    expect(read().streak).toBe(1)
  })

  it('advances the streak after a one-day gap', () => {
    importProgress('hi', JSON.stringify({ lessons: {}, totalXP: 0, streak: 4, lastPlayed: iso(1) }))
    completeLesson('hi', 'lesson-1-1', 5, 6)
    expect(read().streak).toBe(5)
  })

  // The reference implementation recomputed the streak only inside its
  // completion handler, which returned early for already-completed lessons, so
  // a lapsed streak displayed 🔥7 forever.
  it('reports a lapsed streak as zero without needing a completion', () => {
    importProgress('hi', JSON.stringify({ lessons: {}, totalXP: 30, streak: 7, lastPlayed: iso(4) }))
    expect(read().streak).toBe(0)
    expect(read().totalXP).toBe(30)
  })

  it('restarts a lapsed streak at one', () => {
    importProgress('hi', JSON.stringify({ lessons: {}, totalXP: 0, streak: 7, lastPlayed: iso(5) }))
    completeLesson('hi', 'lesson-1-1', 5, 6)
    expect(read().streak).toBe(1)
  })

  it('keeps progress separate per language', () => {
    completeLesson('hi', 'lesson-1-1', 6, 6)
    expect(read('kn').totalXP).toBe(0)
  })

  it('round-trips through export and import', () => {
    completeLesson('hi', 'lesson-1-1', 6, 6)
    const dump = exportProgress('hi')
    resetProgress('hi')
    expect(read().totalXP).toBe(0)
    expect(importProgress('hi', dump)).toBe(true)
    expect(read().totalXP).toBe(17)
  })

  it('rejects malformed imports instead of corrupting state', () => {
    expect(importProgress('hi', 'not json')).toBe(false)
  })
})

describe('phrase memory', () => {
  beforeEach(() => { storage.clear(); resetProgress('hi'); resetProgress('kn') })

  it('remembers a phrase and schedules it for tomorrow', () => {
    recordPhrases('hi', ['हाँ'], 'hit')
    expect(read().phrases['हाँ']).toMatchObject({ box: 1, due: iso(-1), lastSeen: iso(0), seen: 1 })
  })

  it('saves once for an exercise that tests several phrases', () => {
    const spy = vi.spyOn(storage, 'setItem')
    recordPhrases('hi', ['हाँ', 'नहीं', 'शायद'], 'seen')
    expect(spy).toHaveBeenCalledTimes(1)
    spy.mockRestore()
    expect(Object.keys(read().phrases)).toHaveLength(3)
  })

  it('survives finishing a lesson', () => {
    recordPhrases('hi', ['हाँ'], 'miss')
    completeLesson('hi', 'lesson-1-1', 5, 6)
    expect(read().phrases['हाँ'].misses).toBe(1)
  })

  it('is cleared by a reset', () => {
    recordPhrases('hi', ['हाँ'], 'hit')
    resetProgress('hi')
    expect(read().phrases).toEqual({})
  })

  it('accepts a backup saved before phrase memory existed', () => {
    expect(importProgress('hi', JSON.stringify({ lessons: {}, totalXP: 12, streak: 0, lastPlayed: null }))).toBe(true)
    expect(read().phrases).toEqual({})
    expect(read().totalXP).toBe(12)
  })

  it.each([
    ['a malformed record', { 'हाँ': { box: 9, due: 'soon', lastSeen: iso(0), seen: 1, misses: 0 } }],
    ['an array', []],
    ['null', null],
  ])('rejects a backup whose phrases are %s', (_, phrases) => {
    const dump = JSON.stringify({ lessons: {}, totalXP: 0, streak: 0, lastPlayed: null, phrases })
    expect(importProgress('hi', dump)).toBe(false)
  })
})

describe('recordReview', () => {
  beforeEach(() => { storage.clear(); resetProgress('hi') })

  it('earns XP per correct answer with no clean-run bonus', () => {
    recordReview('hi', 5)
    expect(read().totalXP).toBe(10)
  })

  it('keeps the streak alive without touching lessons', () => {
    importProgress('hi', JSON.stringify({ lessons: {}, totalXP: 0, streak: 3, lastPlayed: iso(1) }))
    recordReview('hi', 2)
    const p = read()
    expect(p.streak).toBe(4)
    expect(p.lastPlayed).toBe(iso(0))
    expect(p.lessons).toEqual({})
  })

  it('does not count twice on a day that already had a lesson', () => {
    completeLesson('hi', 'lesson-1-1', 5, 6)
    recordReview('hi', 3)
    expect(read().streak).toBe(1)
  })
})
