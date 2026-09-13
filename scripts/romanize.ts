/**
 * Drafts and audits the `romanized` field on lesson content.
 *
 * Romanization is the beginner's only way into a script they cannot read yet,
 * so it has to be right. This compares every hand-written value against
 * Sarvam's /transliterate and prints the disagreements for review.
 *
 * It does NOT rewrite content by default. Transliteration output is a
 * suggestion, not an authority -- it renders "इप्प" conventions inconsistently
 * and does not know our house style -- so a human decides. `--write` applies
 * the suggestions for the cases you have already eyeballed.
 *
 *   npm run romanize -- --lang hi              # audit one language
 *   npm run romanize -- --lang hi --write      # apply suggestions
 *   npm run romanize -- --missing              # only fill in blanks
 */
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { config as loadEnv } from 'dotenv'

loadEnv({ path: '.env.local', quiet: true })
loadEnv({ quiet: true })

import { AVAILABLE_LANGUAGES, getCourse } from '../src/content'
import { isLangCode, type LangCode } from '../src/lib/languages'
import { voiceProvider } from '../src/lib/voice'
import { createRateGate } from './lib/rate-gate'

const ROOT = path.join(import.meta.dirname, '..')

const argv = process.argv.slice(2)
const has = (f: string) => argv.includes(f)
const value = (f: string) => {
  const i = argv.indexOf(f)
  return i >= 0 ? argv[i + 1] : undefined
}

const write = has('--write')
const missingOnly = has('--missing')
const langArg = value('--lang')

if (langArg && !isLangCode(langArg)) {
  console.error(`Unknown language "${langArg}". Known: ${AVAILABLE_LANGUAGES.join(', ')}`)
  process.exit(1)
}

const languages: LangCode[] = langArg ? [langArg as LangCode] : AVAILABLE_LANGUAGES

/** Ignore differences that are only case or punctuation. */
const loose = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')

async function main() {
  const voice = voiceProvider()
  // /transliterate is cheaper than TTS but still metered; pace it.
  const gate = createRateGate({ minIntervalMs: 1200, concurrency: 2 })

  let checked = 0
  let differing = 0

  for (const lang of languages) {
    const course = getCourse(lang)
    const file = path.join(ROOT, 'src', 'content', `${lang}.json`)
    const raw = await readFile(file, 'utf8')
    let updated = raw

    const targets = new Map<string, string>() // target -> authored romanization
    for (const unit of course.units) {
      for (const lesson of unit.lessons) {
        for (const ex of lesson.exercises) {
          if (ex.type === 'match-pairs') {
            for (const p of ex.pairs) targets.set(p.target, p.romanized)
          } else {
            targets.set(ex.target, ex.romanized)
            if (ex.type === 'select-phrase') {
              for (const o of ex.options) if (o.romanized) targets.set(o.text, o.romanized)
            }
          }
        }
      }
    }

    console.log(`\n${lang} — ${targets.size} phrases`)

    for (const [target, authored] of targets) {
      if (missingOnly && authored) continue
      checked++
      let suggestion: string
      try {
        suggestion = await gate.run(() => voice.transliterate(target, lang))
      } catch (err) {
        console.error(`  ✗ ${target}: ${(err as Error).message.slice(0, 80)}`)
        continue
      }

      if (loose(suggestion) === loose(authored)) continue
      differing++
      console.log(`  ${target}`)
      console.log(`    ours    : ${authored}`)
      console.log(`    sarvam  : ${suggestion}`)

      if (write) {
        updated = updated.split(JSON.stringify(authored)).join(JSON.stringify(suggestion))
      }
    }

    if (write && updated !== raw) {
      await writeFile(file, updated)
      console.log(`  wrote ${path.relative(ROOT, file)}`)
    }
  }

  console.log(`\nChecked ${checked}, ${differing} differ from Sarvam.`)
  if (!write && differing) {
    console.log('Review the list above. Re-run with --write to apply, or leave ours as-is.')
  }
}

main().catch((err) => {
  console.error(`\n${err instanceof Error ? err.message : err}`)
  process.exit(1)
})
