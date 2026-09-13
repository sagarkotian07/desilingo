import { describe, it, expect } from 'vitest'
import { getCourse } from '@/content'
import { Exercise } from '@/content/schema'
import {
  addDays, schedule, phrasesOf, outcomeFor, selectDue, buildReviewPool, buildReviewLesson,
  isValidPhraseRecord, MAX_BOX, INTERVAL_DAYS, REVIEW_SIZE, type PhraseRecord,
} from '@/lib/phrase-memory'

const DAY = '2026-03-10'
const rec = (over: Partial<PhraseRecord> = {}): PhraseRecord =>
  ({ box: 0, due: DAY, lastSeen: '2026-03-01', seen: 1, misses: 0, ...over })

describe('addDays', () => {
  it('crosses month and year boundaries on the local calendar', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29')
    expect(addDays(DAY, 32)).toBe('2026-04-11')
  })
})

describe('schedule', () => {
  it('climbs one box per day on hits, waiting longer each time', () => {
    let r = schedule(undefined, 'hit', DAY)
    expect(r).toMatchObject({ box: 1, due: addDays(DAY, 1), seen: 1, misses: 0 })
    let day = DAY
    for (let box = 2; box <= MAX_BOX; box++) {
      day = r.due
      r = schedule(r, 'hit', day)
      expect(r.box).toBe(box)
      expect(r.due).toBe(addDays(day, INTERVAL_DAYS[box]))
    }
  })

  it('stops at the top box', () => {
    const r = schedule(rec({ box: MAX_BOX }), 'hit', DAY)
    expect(r.box).toBe(MAX_BOX)
    expect(r.due).toBe(addDays(DAY, 32))
  })

  it('sends a miss back to the bottom, due tomorrow, not today', () => {
    const r = schedule(rec({ box: 4, misses: 2 }), 'miss', DAY)
    expect(r).toMatchObject({ box: 0, due: addDays(DAY, 1), lastSeen: DAY, misses: 3 })
  })

  it('promotes at most once a day', () => {
    const once = schedule(rec({ box: 2 }), 'hit', DAY)
    const twice = schedule(once, 'hit', DAY)
    expect(twice.box).toBe(3)
    expect(twice.due).toBe(once.due)
    expect(twice.seen).toBe(once.seen + 1)
  })

  it('does not undo a miss with a hit on the same day', () => {
    const missed = schedule(rec({ box: 3 }), 'miss', DAY)
    const r = schedule(missed, 'hit', DAY)
    expect(r.box).toBe(0)
    expect(r.due).toBe(addDays(DAY, 1))
  })

  it('records a "seen" without moving the phrase', () => {
    const prev = rec({ box: 3, due: '2026-03-14' })
    const r = schedule(prev, 'seen', DAY)
    expect(r).toMatchObject({ box: 3, due: '2026-03-14', lastSeen: DAY, seen: 2, misses: 0 })
  })

  it('starts an unseen phrase at the bottom on "seen"', () => {
    expect(schedule(undefined, 'seen', DAY)).toEqual({ box: 0, due: addDays(DAY, 1), lastSeen: DAY, seen: 1, misses: 0 })
  })
})

describe('phrasesOf and outcomeFor', () => {
  const hi = getCourse('hi')
  const all = hi.units.flatMap((u) => u.lessons.flatMap((l) => l.exercises))
  const ofType = <T extends Exercise['type']>(t: T) =>
    all.find((e): e is Extract<Exercise, { type: T }> => e.type === t)!

  it('records the target, or every pair for match-pairs, never decoys', () => {
    const lc = ofType('listen-choose')
    expect(phrasesOf(lc)).toEqual([lc.target])
    const sp = ofType('select-phrase')
    expect(phrasesOf(sp)).toEqual([sp.target])
    const mp = ofType('match-pairs')
    expect(phrasesOf(mp)).toEqual(mp.pairs.map((p) => p.target))
  })

  it.each([
    ['listen-choose', 'hit', 'miss'],
    ['select-phrase', 'hit', 'miss'],
    ['word-order', 'hit', 'miss'],
    ['listen-type-roman', 'hit', 'miss'],
    ['speak-repeat', 'hit', 'seen'],
    ['match-pairs', 'hit', 'seen'],
  ] as const)('%s: right is %s, wrong is %s', (type, right, wrong) => {
    const ex = ofType(type)
    expect(outcomeFor(ex, true)).toBe(right)
    expect(outcomeFor(ex, false)).toBe(wrong)
  })
})

describe('isValidPhraseRecord', () => {
  it('accepts a well-formed record', () => expect(isValidPhraseRecord(rec())).toBe(true))
  it.each([
    ['box out of range', { box: 7 }],
    ['fractional box', { box: 1.5 }],
    ['non-date due', { due: 'tomorrow' }],
    ['negative misses', { misses: -1 }],
    ['infinite seen', { seen: Infinity }],
  ])('rejects %s', (_, over) => {
    expect(isValidPhraseRecord({ ...rec(), ...over })).toBe(false)
  })
})

describe('selectDue', () => {
  const known = new Set(['a', 'b', 'c', 'd', 'e', 'f', 'g'])

  it('orders by box, then due date, then misses, then last seen', () => {
    const phrases = {
      a: rec({ box: 2, due: '2026-03-01' }),
      b: rec({ box: 0, due: '2026-03-09' }),
      c: rec({ box: 0, due: '2026-03-05' }),
      d: rec({ box: 0, due: '2026-03-05', misses: 4 }),
      e: rec({ box: 0, due: '2026-03-05', misses: 4, lastSeen: '2026-02-01' }),
    }
    expect(selectDue(phrases, known, DAY).map(([t]) => t)).toEqual(['e', 'd', 'c', 'b', 'a'])
  })

  it('leaves out phrases not yet due and phrases no longer in the course', () => {
    const phrases = {
      a: rec({ due: DAY }),
      b: rec({ due: addDays(DAY, 1) }),
      gone: rec({ due: '2026-01-01' }),
    }
    expect(selectDue(phrases, known, DAY).map(([t]) => t)).toEqual(['a'])
  })

  it(`takes at most ${REVIEW_SIZE}`, () => {
    const phrases = Object.fromEntries([...known].map((t) => [t, rec()]))
    expect(selectDue(phrases, known, DAY)).toHaveLength(REVIEW_SIZE)
    expect(selectDue(phrases, known, DAY, 2)).toHaveLength(2)
  })
})

describe('buildReviewLesson', () => {
  const pool = buildReviewPool(getCourse('hi'))
  const dueAll = (texts: string[], box = 0) => Object.fromEntries(texts.map((t) => [t, rec({ box })]))
  const withType = (type: string) =>
    Object.values(pool).find((p) => p.exercises.some((e) => e.type === type) && p.exercises.length > 1)!

  it('pools every target the course can record, including match-pairs', () => {
    expect(pool['शुक्रिया']).toBeDefined()
    for (const entry of Object.values(pool)) {
      for (const ex of entry.exercises) {
        expect(['listen-choose', 'select-phrase', 'word-order']).toContain(ex.type)
        expect(ex.target).toBe(entry.text)
      }
    }
  })

  it('returns null when nothing is due', () => {
    expect(buildReviewLesson(pool, {}, DAY)).toBeNull()
    expect(buildReviewLesson(pool, { 'शुक्रिया': rec({ due: addDays(DAY, 3) }) }, DAY)).toBeNull()
  })

  it('never speaks, types or matches, and gives every exercise its own id', () => {
    const lesson = buildReviewLesson(pool, dueAll(Object.keys(pool)), DAY)!
    expect(lesson.exercises).toHaveLength(REVIEW_SIZE)
    expect(lesson.exercises.map((e) => e.id)).toEqual(['r0', 'r1', 'r2', 'r3', 'r4'])
    for (const ex of lesson.exercises) {
      expect(['listen-choose', 'select-phrase', 'word-order']).toContain(ex.type)
      expect(() => Exercise.parse(ex)).not.toThrow()
    }
  })

  it('does not pad a short review', () => {
    const texts = Object.keys(pool).slice(0, 2)
    expect(buildReviewLesson(pool, dueAll(texts), DAY)!.exercises).toHaveLength(2)
  })

  it('asks a fragile phrase to be recognised and a known one to be built', () => {
    const entry = withType('word-order')
    const types = entry.exercises.map((e) => e.type)
    const fragile = buildReviewLesson(pool, dueAll([entry.text], 0), DAY)!.exercises[0]
    const known = buildReviewLesson(pool, dueAll([entry.text], 3), DAY)!.exercises[0]
    expect(known.type).toBe('word-order')
    expect(fragile.type).toBe(types.includes('listen-choose') ? 'listen-choose' : 'select-phrase')
  })

  it('makes up a "what does it mean?" for a phrase only ever spoken or matched', () => {
    const ex = buildReviewLesson(pool, dueAll(['शुक्रिया']), DAY)!.exercises[0]
    expect(ex.type).toBe('listen-choose')
    if (ex.type !== 'listen-choose') throw new Error('unreachable')
    expect(ex.target).toBe('शुक्रिया')
    expect(ex.options[ex.answer]).toBe(pool['शुक्रिया'].english)
    expect(ex.options).toHaveLength(4)
    expect(new Set(ex.options).size).toBe(4)
  })

  it('builds the same review twice from the same state', () => {
    const phrases = dueAll(Object.keys(pool))
    expect(buildReviewLesson(pool, phrases, DAY)).toEqual(buildReviewLesson(pool, phrases, DAY))
  })
})
