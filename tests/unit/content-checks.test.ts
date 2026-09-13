import { describe, it, expect } from 'vitest'
import { AVAILABLE_LANGUAGES, getCourse } from '@/content'
import type { Course, Exercise, Lesson } from '@/content/schema'
import { checkCourse, LESSON_EXERCISES } from '@/lib/content-checks'

const hear = (id: string, target: string, answer: number): Extract<Exercise, { type: 'listen-choose' }> => {
  const options = ['a', 'b', 'c'].map((o) => `${o} ${id}`)
  options[answer] = `meaning of ${target}`
  return { id, type: 'listen-choose', target, romanized: target.toUpperCase(), english: `meaning of ${target}`, options, answer }
}
/** Six exercises with the answer spread over three positions. */
const six = () => [0, 1, 2, 0, 1, 2].map((answer, i) => hear(`e${i + 1}`, `t${i + 1}`, answer))
const lesson = (exercises: Exercise[]): Lesson => ({ id: 'lesson-1', title: 'L', exercises })
const course = (...lessons: Lesson[]): Course =>
  ({ lang: 'hi', tagline: 't', units: [{ id: 'unit-1', title: 'U', emoji: '·', lessons }] })
const failuresOf = (c: Course) => checkCourse(c).failures

describe('checkCourse', () => {
  it('passes a well-formed course', () => {
    expect(failuresOf(course(lesson(six())))).toEqual([])
  })

  it.each(AVAILABLE_LANGUAGES)('passes the shipped %s course', (lang) => {
    expect(failuresOf(getCourse(lang))).toEqual([])
  })

  // Review keys on the exact target: a second gloss hidden in match-pairs made
  // the same phrase review under whichever meaning was seen first.
  it('catches a phrase glossed two ways, match-pairs included', () => {
    const ex: Exercise[] = six()
    ex[5] = {
      id: 'e6', type: 'match-pairs',
      pairs: [
        { target: 't1', english: 'something else', romanized: 'T1' },
        { target: 'p2', english: 'p2', romanized: 'P2' },
        { target: 'p3', english: 'p3', romanized: 'P3' },
      ],
    }
    expect(failuresOf(course(lesson(ex)))).toEqual([expect.stringContaining('"t1" means "something else"')])
  })

  it('catches a phrase romanized two ways', () => {
    const ex: Exercise[] = six()
    ex[5] = { ...hear('e6', 't1', 2), romanized: 'Tee one' }
    expect(failuresOf(course(lesson(ex)))).toEqual([expect.stringContaining('"t1" reads "Tee one"')])
  })

  it(`holds a lesson to ${LESSON_EXERCISES} exercises`, () => {
    expect(failuresOf(course(lesson(six().slice(0, 5))))).toEqual([expect.stringContaining('5 exercises')])
  })

  it('holds a scene to 5-6 turns and 2 speak turns', () => {
    const lead = { text: 'x?', romanized: 'X?', english: 'X?' }
    const say = (i: number): Exercise =>
      ({ id: `e${i}`, type: 'speak-repeat', target: `say${i}`, romanized: `SAY${i}`, english: `say ${i}`, lead })
    const scene: Lesson = {
      id: 'scene-1', title: 'S', scene: { setting: 'x', other: 'y' }, exercises: [say(1), say(2), say(3), say(4)],
    }
    expect(failuresOf(course(lesson(six()), scene))).toEqual([
      expect.stringContaining('4 turns'),
      expect.stringContaining('4 speak turns'),
    ])
  })

  it('catches answers parked at one position', () => {
    const ex = six().map((_, i) => hear(`e${i + 1}`, `t${i + 1}`, 0))
    expect(failuresOf(course(lesson(ex)))).toEqual([expect.stringContaining('clustered')])
  })
})
