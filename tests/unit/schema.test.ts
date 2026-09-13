import { describe, it, expect } from 'vitest'
import { Lesson, Unit, isScene, MAX_SCENE_TURNS } from '@/content/schema'

const lead = { text: 'चाय लोगे?', romanized: 'Chai loge?', english: 'Tea?' }

const choose = (over: Record<string, unknown> = {}) => ({
  id: 'e1', type: 'select-phrase', target: 'हाँ', romanized: 'Haan', english: 'Yes',
  options: [{ text: 'हाँ' }, { text: 'नहीं' }, { text: 'शायद' }], answer: 0, lead, ...over,
})
const say = { id: 'e2', type: 'speak-repeat', target: 'कम चीनी', romanized: 'Kam cheeni', english: 'Less sugar', lead }
const hear = {
  id: 'e3', type: 'listen-choose', target: 'बीस रुपये', romanized: 'Bees rupaye', english: 'Twenty rupees',
  options: ['Twenty rupees', 'Two rupees', 'Free'], answer: 0,
}
const matching = {
  id: 'e4', type: 'match-pairs',
  pairs: [1, 2, 3].map((n) => ({ target: `क${n}`, english: `k${n}`, romanized: `k${n}` })),
}
const typing = { id: 'e5', type: 'listen-type-roman', target: 'चाय', romanized: 'Chai', english: 'Tea', lead }

const scene = (exercises: unknown[]) => ({
  id: 'scene-1', title: 'A cup of chai', scene: { setting: 'A chai stall.', other: 'Chai-wala' }, exercises,
})
const lesson = (exercises: unknown[]) => ({ id: 'lesson-1', title: 'Basics', exercises })

describe('scenes', () => {
  it('accepts choose, say and build turns with a lead, and a hear turn without one', () => {
    const build = { id: 'e6', type: 'word-order', target: 'एक चाय देना', romanized: 'Ek chai dena', english: 'One tea, please', lead }
    expect(Lesson.safeParse(scene([choose(), say, build, hear])).success).toBe(true)
  })

  it('rejects a turn with nobody to answer', () => {
    expect(Lesson.safeParse(scene([choose({ lead: undefined }), say, hear])).success).toBe(false)
    expect(Lesson.safeParse(scene([choose(), { ...say, lead: undefined }, hear])).success).toBe(false)
  })

  it('lets a turn answer the listen turn just before it', () => {
    expect(Lesson.safeParse(scene([hear, { ...say, lead: undefined }, choose()])).success).toBe(true)
  })

  it('rejects a lead on a listen turn, where the target is already their line', () => {
    expect(Lesson.safeParse(scene([choose(), say, { ...hear, lead }])).success).toBe(false)
  })

  it.each([['match-pairs', matching], ['listen-type-roman', typing]])('rejects %s as a turn', (_, ex) => {
    expect(Lesson.safeParse(scene([choose(), say, ex])).success).toBe(false)
  })

  it(`caps a scene at ${MAX_SCENE_TURNS} turns`, () => {
    const turns = Array.from({ length: MAX_SCENE_TURNS + 1 }, (_, i) => choose({ id: `e${i}` }))
    expect(Lesson.safeParse(scene(turns)).success).toBe(false)
  })

  it('keeps leads out of ordinary lessons', () => {
    expect(Lesson.safeParse(lesson([choose(), say, hear])).success).toBe(false)
    expect(Lesson.safeParse(lesson([choose({ lead: undefined }), { ...say, lead: undefined }, hear])).success).toBe(true)
  })

  it('tells a scene from a lesson', () => {
    expect(isScene(Lesson.parse(scene([choose(), say, hear])))).toBe(true)
    expect(isScene(Lesson.parse(lesson([hear, hear, hear])))).toBe(false)
  })
})

describe('units with a scene', () => {
  const plain = lesson([hear, hear, hear])
  const unit = (lessons: unknown[]) => ({ id: 'unit-1', title: 'Out and about', emoji: '☕', lessons })
  const s = scene([choose(), say, hear])

  it('put the scene last', () => {
    expect(Unit.safeParse(unit([plain, s])).success).toBe(true)
    expect(Unit.safeParse(unit([s, plain])).success).toBe(false)
  })

  it('have at most one', () => {
    expect(Unit.safeParse(unit([plain, { ...s, id: 'scene-0' }, s])).success).toBe(false)
  })
})
