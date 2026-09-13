/**
 * Content validation. Runs in CI and before an audio generation run.
 *
 * Beyond schema conformance this asserts the invariants that a schema cannot
 * express -- most importantly that the correct answer is not always in the same
 * position. The app that inspired this one authored the right answer first in
 * all 75 of its multiple-choice questions and never shuffled at runtime, so the
 * entire quiz was solvable by always tapping the top-left box. That is the kind
 * of bug that survives code review and destroys the product, so it gets a test.
 */
import { AVAILABLE_LANGUAGES, getCourse } from '../src/content'
import { collectPhrases, estimateRupees, totalChars } from '../src/lib/phrases'
import { hasOptions, isScene } from '../src/content/schema'

let failures = 0
const fail = (msg: string) => { console.error(`  ✗ ${msg}`); failures++ }
const warn = (msg: string) => console.warn(`  ! ${msg}`)

/** Each speak turn is a paid speech-to-text call on a public key. */
const MAX_SCENE_SPEAK_TURNS = 2

for (const lang of AVAILABLE_LANGUAGES) {
  console.log(`\n${lang}`)
  const course = getCourse(lang) // throws on schema violation

  const lessonIds = new Set<string>()
  const answerPositions: number[] = []
  const meaningOf = new Map<string, string>()
  let exercises = 0
  let scenes = 0

  // Audio keys hash the exact text, and phrase memory keys on it too, so a
  // stray space makes a second, different phrase.
  const trimmed = (text: string, where: string) => {
    if (text !== text.trim()) fail(`${where}: "${text}" has leading or trailing space`)
  }

  for (const unit of course.units) {
    for (const lesson of unit.lessons) {
      if (lessonIds.has(lesson.id)) fail(`duplicate lesson id "${lesson.id}"`)
      lessonIds.add(lesson.id)

      // Turn types, leads and position are enforced by the schema.
      if (isScene(lesson)) {
        scenes++
        const speaks = lesson.exercises.filter((e) => e.type === 'speak-repeat').length
        if (speaks > MAX_SCENE_SPEAK_TURNS) warn(`${lesson.id}: ${speaks} speak turns; keep it to ${MAX_SCENE_SPEAK_TURNS}`)
      }

      const exIds = new Set<string>()
      for (const ex of lesson.exercises) {
        exercises++
        if (exIds.has(ex.id)) fail(`${lesson.id}: duplicate exercise id "${ex.id}"`)
        exIds.add(ex.id)

        const where = `${lesson.id}/${ex.id}`
        if (ex.type === 'match-pairs') {
          for (const p of ex.pairs) trimmed(p.target, where)
        } else {
          trimmed(ex.target, where)
          if (ex.lead) trimmed(ex.lead.text, `${where} lead`)
          // Phrase memory treats one target as one piece of knowledge; two
          // meanings for it would review against whichever came first.
          const known = meaningOf.get(ex.target)
          if (known === undefined) meaningOf.set(ex.target, ex.english)
          else if (known !== ex.english) warn(`${where}: "${ex.target}" means "${ex.english}" here, "${known}" elsewhere`)
        }

        if (hasOptions(ex)) {
          if (ex.answer >= ex.options.length) {
            fail(`${lesson.id}/${ex.id}: answer index ${ex.answer} out of range`)
          }
          answerPositions.push(ex.answer)

          const texts = ex.options.map((o) => (typeof o === 'string' ? o : o.text))
          if (new Set(texts).size !== texts.length) {
            fail(`${lesson.id}/${ex.id}: duplicate options`)
          }
          // The correct option must actually be the phrase being taught.
          if (ex.type === 'select-phrase' && ex.options[ex.answer].text !== ex.target) {
            fail(`${lesson.id}/${ex.id}: option[answer] does not match target`)
          }
          if (ex.type === 'listen-choose' && ex.options[ex.answer] !== ex.english) {
            fail(`${lesson.id}/${ex.id}: option[answer] does not match english`)
          }
        }

        if (ex.type === 'word-order' && ex.target.split(/\s+/).length < 2) {
          fail(`${lesson.id}/${ex.id}: word-order needs at least two words`)
        }
      }
    }
  }

  // Answer positions must be spread out, not parked at index 0.
  const counts = new Map<number, number>()
  for (const p of answerPositions) counts.set(p, (counts.get(p) ?? 0) + 1)
  const distinct = counts.size
  const worst = Math.max(...counts.values())
  const share = worst / answerPositions.length
  if (distinct < 3 || share > 0.5) {
    fail(
      `answer positions are clustered (${distinct} distinct, ${(share * 100).toFixed(0)}% at one index). ` +
      `Spread the correct answer around.`,
    )
  }

  // Every clip the UI can request must exist, or a control is silently dead.
  const jobs = collectPhrases(course)
  console.log(`  ${course.units.length} units, ${lessonIds.size} lessons (${scenes} scenes), ${exercises} exercises`)
  console.log(`  answer positions: ${[...counts.entries()].sort().map(([k, v]) => `${k}×${v}`).join(' ')}`)
  console.log(`  ${jobs.length} audio clips, ${totalChars(jobs)} chars, ~₹${estimateRupees(jobs).toFixed(2)}`)
}

if (failures) {
  console.error(`\n${failures} problem(s) found.`)
  process.exit(1)
}
console.log('\nAll content valid.')
