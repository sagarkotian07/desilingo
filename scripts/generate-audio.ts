/**
 * Pre-generates every lesson clip with Sarvam TTS.
 *
 * Lesson content is static, so synthesizing at request time -- as the app that
 * inspired this one does -- means every visitor waits on a paid API call to hear
 * a phrase that never changes. Generating once and committing the MP3s makes
 * playback a static CDN fetch: instant, free, and working on a fresh clone with
 * no API key at all.
 *
 * This never runs in CI or in the Vercel build. It is a local, deliberate,
 * money-spending action. Run `--dry-run` first; it prints the exact cost.
 *
 *   npm run gen:audio -- --dry-run
 *   npm run gen:audio -- --lang hi
 */
import { writeFile, rename, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { config as loadEnv } from 'dotenv'

// .env.local first (that's where the key lives and it is gitignored), then .env.
loadEnv({ path: '.env.local', quiet: true })
loadEnv({ quiet: true })

import { AVAILABLE_LANGUAGES, getCourse } from '../src/content'
import { collectPhrases, estimateRupees, totalChars, type PhraseJob } from '../src/lib/phrases'
import { isLangCode, type LangCode } from '../src/lib/languages'
import type { AudioManifest } from '../src/lib/audio'
import { sarvam } from '../src/lib/voice/sarvam'
import { VoiceError } from '../src/lib/voice/types'
import { createRateGate } from './lib/rate-gate'

const ROOT = path.join(import.meta.dirname, '..')
const AUDIO_DIR = path.join(ROOT, 'public', 'audio')
const MANIFEST = path.join(ROOT, 'src', 'generated', 'audio-manifest.json')

/** bulbul:v3 is limited to 30 requests/minute on the Starter tier. 2200ms gives
 *  ~27/min, leaving headroom rather than riding the limit. */
const MIN_INTERVAL_MS = 2200
const CONCURRENCY = 3
const MAX_ATTEMPTS = 5

const argv = process.argv.slice(2)
const has = (flag: string) => argv.includes(flag)
const value = (flag: string) => {
  const i = argv.indexOf(flag)
  return i >= 0 ? argv[i + 1] : undefined
}

const dryRun = has('--dry-run')
const force = has('--force')
const maxChars = Number(value('--max-chars') ?? Infinity)
const langArg = value('--lang')

if (langArg && !isLangCode(langArg)) {
  console.error(`Unknown language "${langArg}". Known: ${AVAILABLE_LANGUAGES.join(', ')}`)
  process.exit(1)
}

const languages: LangCode[] = langArg ? [langArg as LangCode] : AVAILABLE_LANGUAGES

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** An MP3 must start with an ID3 tag or a frame sync. Guards against a truncated
 *  or error-page write being mistaken for a finished clip on the next run. */
function looksLikeMp3(buf: Buffer): boolean {
  if (buf.length < 1000) return false
  if (buf.subarray(0, 3).toString('latin1') === 'ID3') return true
  return buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0
}

async function loadManifest(): Promise<AudioManifest> {
  if (!existsSync(MANIFEST)) return {}
  const { readFile } = await import('node:fs/promises')
  return JSON.parse(await readFile(MANIFEST, 'utf8')) as AudioManifest
}

async function saveManifest(m: AudioManifest): Promise<void> {
  await mkdir(path.dirname(MANIFEST), { recursive: true })
  const tmp = `${MANIFEST}.tmp`
  const sorted = Object.fromEntries(Object.entries(m).sort(([a], [b]) => a.localeCompare(b)))
  await writeFile(tmp, JSON.stringify(sorted, null, 2) + '\n')
  await rename(tmp, MANIFEST)
}

function filePath(job: PhraseJob): string {
  return path.join(AUDIO_DIR, job.lang, `${job.key}.mp3`)
}

/**
 * Writes to a temp file and renames, which is atomic on the same filesystem.
 * Skip-if-exists plus a non-atomic write is a silent corruption trap: interrupt
 * the process mid-write and you leave a truncated MP3 that every later run
 * happily skips over.
 */
async function writeClip(job: PhraseJob, bytes: Buffer): Promise<void> {
  const dest = filePath(job)
  await mkdir(path.dirname(dest), { recursive: true })
  const tmp = `${dest}.tmp`
  await writeFile(tmp, bytes)
  await rename(tmp, dest)
}

async function synthesizeWithRetry(job: PhraseJob, gate: ReturnType<typeof createRateGate>): Promise<Buffer> {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const buf = Buffer.from(
        await gate.run(() => sarvam.synthesize({ text: job.text, lang: job.lang, pace: job.pace, speaker: job.speaker })),
      )
      if (!looksLikeMp3(buf)) throw new VoiceError(`Response was not valid MP3 (${buf.length} bytes)`, 502, true)
      return buf
    } catch (err) {
      const ve = err instanceof VoiceError ? err : null
      // A bad key will never come good; retrying wastes minutes of rate budget.
      if (ve && !ve.retryable) throw err
      if (attempt === MAX_ATTEMPTS) throw err
      const backoff = ve?.retryAfterMs ?? 2 ** attempt * 1000 + Math.random() * 500
      if (ve?.status === 429) gate.penalize(backoff)
      console.warn(`    retry ${attempt}/${MAX_ATTEMPTS - 1} in ${Math.round(backoff)}ms — ${(err as Error).message.slice(0, 80)}`)
      await sleep(backoff)
    }
  }
  throw new Error('unreachable')
}

async function main() {
  const all: PhraseJob[] = []
  for (const lang of languages) all.push(...collectPhrases(getCourse(lang)))

  const manifest = await loadManifest()
  const todo: PhraseJob[] = []
  for (const job of all) {
    const done = !force && existsSync(filePath(job)) && manifest[job.key]
    if (!done) todo.push(job)
  }

  const chars = totalChars(todo)
  console.log(`Languages : ${languages.join(', ')}`)
  console.log(`Clips     : ${all.length} total, ${all.length - todo.length} already generated`)
  console.log(`To do     : ${todo.length} clips, ${chars} characters`)
  console.log(`Estimated : ₹${estimateRupees(todo).toFixed(2)}  (₹30 per 10,000 characters)`)
  console.log(`Time      : ~${Math.ceil((todo.length * MIN_INTERVAL_MS) / 60000)} min at ${MIN_INTERVAL_MS}ms spacing`)

  if (chars > maxChars) {
    console.error(`\nAborting: ${chars} characters exceeds --max-chars ${maxChars}.`)
    process.exit(1)
  }
  if (dryRun) {
    console.log('\nDry run — no API calls made, nothing spent.')
    return
  }
  if (!todo.length) {
    console.log('\nNothing to do.')
    return
  }

  const gate = createRateGate({ minIntervalMs: MIN_INTERVAL_MS, concurrency: CONCURRENCY })
  let done = 0
  let failed = 0
  const failures: Array<{ job: PhraseJob; error: string }> = []

  await Promise.all(
    todo.map(async (job) => {
      try {
        const bytes = await synthesizeWithRetry(job, gate)
        await writeClip(job, bytes)
        manifest[job.key] = {
          lang: job.lang, text: job.text, pace: job.pace,
          speaker: job.speaker, bytes: bytes.length,
        }
        done++
        if (done % 10 === 0) await saveManifest(manifest) // crash loses seconds, not minutes
        console.log(`  [${done + failed}/${todo.length}] ${job.lang} ${job.pace}× ${job.text.slice(0, 28)}`)
      } catch (err) {
        failed++
        failures.push({ job, error: (err as Error).message })
        console.error(`  ✗ ${job.lang} "${job.text.slice(0, 28)}": ${(err as Error).message.slice(0, 120)}`)
      }
    }),
  )

  await saveManifest(manifest)

  let totalBytes = 0
  for (const key of Object.keys(manifest)) totalBytes += manifest[key].bytes
  console.log(`\nGenerated ${done}, failed ${failed}.`)
  console.log(`Manifest now holds ${Object.keys(manifest).length} clips, ${(totalBytes / 1e6).toFixed(1)} MB on disk.`)
  if (failures.length) {
    console.log('\nFailures:')
    for (const f of failures) console.log(`  ${f.job.lang} "${f.job.text}" — ${f.error}`)
    process.exit(1)
  }
}

main().catch((err) => {
  console.error(`\n${err instanceof Error ? err.message : err}`)
  process.exit(1)
})
