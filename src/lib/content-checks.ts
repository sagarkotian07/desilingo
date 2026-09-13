import { hasOptions, isScene, type Course } from '@/content/schema'

/**
 * Course invariants a schema can't express. Pure, so the validator script and
 * the tests run the same rules.
 *
 * Most important: the correct answer must not always sit in the same place.
 * The app that inspired this one authored the right answer first in all 75 of
 * its multiple-choice questions and never shuffled at runtime, so the whole
 * quiz was solvable by tapping the top-left box.
 */

/** An ordinary lesson is six exercises; XP and pacing assume it. */
export const LESSON_EXERCISES = 6
export const SCENE_TURNS = { min: 5, max: 6 } as const
/** Each speak turn is a paid speech-to-text call on a public key. */
export const MAX_SCENE_SPEAK_TURNS = 2

export interface CourseReport {
  failures: string[]
  lessons: number
  scenes: number
  exercises: number
  /** How often the correct answer sits at each option index. */
  answerPositions: Map<number, number>
}

export function checkCourse(course: Course): CourseReport {
  const failures: string[] = []
  const fail = (msg: string) => { failures.push(msg) }
  const lessonIds = new Set<string>()
  const answerPositions = new Map<number, number>()
  // Audio and Review both key on exact text, so a target must read and mean
  // the same wherever it appears, match-pairs included.
  const first = new Map<string, { english: string; romanized: string; where: string }>()
  let exercises = 0
  let scenes = 0

  const phrase = (target: string, english: string, romanized: string, where: string) => {
    if (target !== target.trim()) fail(`${where}: "${target}" has leading or trailing space`)
    const seen = first.get(target)
    if (!seen) { first.set(target, { english, romanized, where }); return }
    if (seen.english !== english) fail(`${where}: "${target}" means "${english}" here, "${seen.english}" at ${seen.where}`)
    if (seen.romanized !== romanized) fail(`${where}: "${target}" reads "${romanized}" here, "${seen.romanized}" at ${seen.where}`)
  }

  for (const unit of course.units) {
    for (const lesson of unit.lessons) {
      if (lessonIds.has(lesson.id)) fail(`duplicate lesson id "${lesson.id}"`)
      lessonIds.add(lesson.id)
      const n = lesson.exercises.length

      // Turn types, leads and position are enforced by the schema.
      if (isScene(lesson)) {
        scenes++
        if (n < SCENE_TURNS.min || n > SCENE_TURNS.max) {
          fail(`${lesson.id}: ${n} turns; a scene has ${SCENE_TURNS.min}-${SCENE_TURNS.max}`)
        }
        const speaks = lesson.exercises.filter((e) => e.type === 'speak-repeat').length
        if (speaks > MAX_SCENE_SPEAK_TURNS) fail(`${lesson.id}: ${speaks} speak turns; at most ${MAX_SCENE_SPEAK_TURNS}`)
      } else if (n !== LESSON_EXERCISES) {
        fail(`${lesson.id}: ${n} exercises; a lesson has ${LESSON_EXERCISES}`)
      }

      const exIds = new Set<string>()
      for (const ex of lesson.exercises) {
        exercises++
        const where = `${lesson.id}/${ex.id}`
        if (exIds.has(ex.id)) fail(`${lesson.id}: duplicate exercise id "${ex.id}"`)
        exIds.add(ex.id)

        if (ex.type === 'match-pairs') {
          for (const p of ex.pairs) phrase(p.target, p.english, p.romanized, where)
          continue
        }
        phrase(ex.target, ex.english, ex.romanized, where)
        if (ex.lead && ex.lead.text !== ex.lead.text.trim()) fail(`${where} lead: "${ex.lead.text}" has leading or trailing space`)

        if (hasOptions(ex)) {
          if (ex.answer >= ex.options.length) fail(`${where}: answer index ${ex.answer} out of range`)
          answerPositions.set(ex.answer, (answerPositions.get(ex.answer) ?? 0) + 1)
          const texts = ex.options.map((o) => (typeof o === 'string' ? o : o.text))
          if (new Set(texts).size !== texts.length) fail(`${where}: duplicate options`)
          // The correct option must actually be the phrase being taught.
          if (ex.type === 'select-phrase' && ex.options[ex.answer]?.text !== ex.target) fail(`${where}: option[answer] does not match target`)
          if (ex.type === 'listen-choose' && ex.options[ex.answer] !== ex.english) fail(`${where}: option[answer] does not match english`)
        }

        if (ex.type === 'word-order' && ex.target.split(/\s+/).length < 2) fail(`${where}: word-order needs at least two words`)
      }
    }
  }

  const total = [...answerPositions.values()].reduce((a, b) => a + b, 0)
  if (total > 0) {
    const share = Math.max(...answerPositions.values()) / total
    if (answerPositions.size < 3 || share > 0.5) {
      fail(`answer positions are clustered (${answerPositions.size} distinct, ${(share * 100).toFixed(0)}% at one index). Spread the correct answer around.`)
    }
  }

  return { failures, lessons: lessonIds.size, scenes, exercises, answerPositions }
}
