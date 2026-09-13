/**
 * Build-time guard: every manifest entry must have a file on disk.
 *
 * Makes zero API calls, so it is safe to run in CI and on every build. It exists
 * to catch the failure that would otherwise reach production silently --
 * generating audio locally and forgetting to commit the MP3s, which leaves the
 * app pointing at URLs that 404.
 */
import { existsSync, statSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { AVAILABLE_LANGUAGES, getCourse } from '../src/content'
import { collectPhrases } from '../src/lib/phrases'
import type { AudioManifest } from '../src/lib/audio'

const ROOT = path.join(import.meta.dirname, '..')
const MANIFEST = path.join(ROOT, 'src', 'generated', 'audio-manifest.json')

async function main() {
  let problems = 0
  const fail = (msg: string) => { console.error(`  ✗ ${msg}`); problems++ }

  if (!existsSync(MANIFEST)) {
    console.error(`No audio manifest at ${MANIFEST}. Run: npm run gen:audio`)
    process.exit(1)
  }

  const manifest = JSON.parse(await readFile(MANIFEST, 'utf8')) as AudioManifest

  let bytes = 0
  for (const [key, entry] of Object.entries(manifest)) {
    const file = path.join(ROOT, 'public', 'audio', entry.lang, `${key}.mp3`)
    if (!existsSync(file)) { fail(`${entry.lang}/${key}.mp3 is in the manifest but not on disk`); continue }
    const size = statSync(file).size
    if (size < 1000) fail(`${entry.lang}/${key}.mp3 is suspiciously small (${size} bytes)`)
    bytes += size
  }

  // And the reverse: every clip the UI can request must be in the manifest.
  // This is what catches a control that renders but has nothing to play.
  for (const lang of AVAILABLE_LANGUAGES) {
    for (const job of collectPhrases(getCourse(lang))) {
      if (!manifest[job.key]) fail(`${lang}: no audio for "${job.text}" at pace ${job.pace}`)
    }
  }

  if (problems) {
    console.error(`\n${problems} problem(s). Run: npm run gen:audio`)
    process.exit(1)
  }
  console.log(`Audio OK — ${Object.keys(manifest).length} clips, ${(bytes / 1e6).toFixed(1)} MB.`)
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
