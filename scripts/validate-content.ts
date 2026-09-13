/**
 * Content validation. Runs in CI and before an audio generation run.
 *
 * Schema conformance comes from getCourse; the rules a schema can't express
 * live in src/lib/content-checks.ts, so the tests run exactly what CI runs.
 */
import { AVAILABLE_LANGUAGES, getCourse } from '../src/content'
import { collectPhrases, estimateRupees, totalChars } from '../src/lib/phrases'
import { checkCourse } from '../src/lib/content-checks'

let failures = 0

for (const lang of AVAILABLE_LANGUAGES) {
  console.log(`\n${lang}`)
  const course = getCourse(lang) // throws on schema violation
  const report = checkCourse(course)
  for (const msg of report.failures) console.error(`  ✗ ${msg}`)
  failures += report.failures.length

  // Every clip the UI can request must exist, or a control is silently dead.
  const jobs = collectPhrases(course)
  const positions = [...report.answerPositions.entries()].sort(([a], [b]) => a - b)
  console.log(`  ${course.units.length} units, ${report.lessons} lessons (${report.scenes} scenes), ${report.exercises} exercises`)
  console.log(`  answer positions: ${positions.map(([k, v]) => `${k}×${v}`).join(' ')}`)
  console.log(`  ${jobs.length} audio clips, ${totalChars(jobs)} chars, ~₹${estimateRupees(jobs).toFixed(2)}`)
}

if (failures) {
  console.error(`\n${failures} problem(s) found.`)
  process.exit(1)
}
console.log('\nAll content valid.')
