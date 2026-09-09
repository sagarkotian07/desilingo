/**
 * Live round-trip against the real Sarvam API.
 *
 * Gated behind SARVAM_LIVE=1 and never run in CI: it costs money and consumes
 * rate-limit budget.
 *
 *   SARVAM_LIVE=1 npx vitest run tests/integration
 *
 * What this proves: that a clean synthetic reading of our own target phrase makes
 * it through record -> upload -> transcribe -> normalize -> score and comes out
 * passing. If it doesn't, the normalizer is wrong, and the fix is the normalizer
 * -- never a lowered threshold.
 *
 * What it cannot prove: anything about real accented speech, background noise, or
 * the browser codec path. Those need the fixtures and a human.
 */
import { describe, it, expect, beforeAll } from 'vitest'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { config as loadEnv } from 'dotenv'

import { sarvam } from '@/lib/voice/sarvam'
import { scorePronunciation } from '@/lib/scoring/score'
import type { AudioManifest } from '@/lib/audio'
import type { LangCode } from '@/lib/languages'

loadEnv({ path: '.env.local', quiet: true })

const live = process.env.SARVAM_LIVE === '1'
const ROOT = path.join(import.meta.dirname, '..', '..')

let manifest: AudioManifest = {}

async function transcribeClip(key: string, lang: LangCode) {
  const bytes = await readFile(path.join(ROOT, 'public', 'audio', lang, `${key}.mp3`))
  const blob = new Blob([new Uint8Array(bytes)], { type: 'audio/mpeg' })
  return sarvam.transcribe({ audio: blob, lang, filename: 'clip.mp3' })
}

describe.skipIf(!live)('Sarvam round-trip', () => {
  beforeAll(async () => {
    manifest = JSON.parse(await readFile(path.join(ROOT, 'src/generated/audio-manifest.json'), 'utf8'))
  })

  it('transcribes our own generated audio back to a passing score', async () => {
    const entries = Object.entries(manifest)
      .filter(([, v]) => v.pace === 1 && v.lang === 'hi')
      .slice(0, 8)
    expect(entries.length).toBeGreaterThan(0)

    const results: Array<{ target: string; heard: string; score: number; passed: boolean }> = []
    for (const [key, entry] of entries) {
      const { transcript, detectedLanguage } = await transcribeClip(key, entry.lang)
      const r = scorePronunciation({
        target: entry.text, transcript, lang: entry.lang, detectedLanguage,
      })
      results.push({ target: entry.text, heard: r.heardTranscript, score: r.score, passed: r.passed })
    }

    for (const r of results) {
      console.log(`  ${r.score.toFixed(3)} ${r.passed ? 'PASS' : 'FAIL'}  "${r.target}" -> "${r.heard}"`)
    }
    for (const r of results) {
      expect(r.passed, `"${r.target}" heard as "${r.heard}" scored ${r.score.toFixed(3)}`).toBe(true)
      expect(r.score).toBeGreaterThanOrEqual(0.9)
    }
  }, 180_000)

  it('does not award a perfect score to a deliberately wrong pronunciation', async () => {
    // Synthesize a near-miss -- retroflex swapped for dental, aspiration dropped --
    // and confirm the scorer can actually tell it apart from the real phrase.
    // Without this, the round-trip above only ever proves the happy path.
    const target = 'ठीक है'
    const nearMiss = 'तीक है'
    const audio = await sarvam.synthesize({ text: nearMiss, lang: 'hi' })
    const { transcript } = await sarvam.transcribe({
      audio: new Blob([audio], { type: 'audio/mpeg' }), lang: 'hi', filename: 'clip.mp3',
    })
    const r = scorePronunciation({ target, transcript, lang: 'hi' })
    console.log(`  near-miss: "${nearMiss}" heard as "${r.heardTranscript}" -> ${r.verdict} ${r.score.toFixed(3)}`)
    expect(r.verdict).not.toBe('perfect')
  }, 120_000)

  it('flags an English answer as the wrong language rather than a bad accent', async () => {
    const audio = await sarvam.synthesize({ text: 'I do not want it', lang: 'hi' })
    const { transcript, detectedLanguage } = await sarvam.transcribe({
      audio: new Blob([audio], { type: 'audio/mpeg' }), lang: 'hi', filename: 'clip.mp3',
    })
    const r = scorePronunciation({ target: 'नहीं चाहिए', transcript, lang: 'hi', detectedLanguage })
    console.log(`  english: heard "${r.heardTranscript}" (${detectedLanguage}) -> ${r.verdict}`)
    expect(r.passed).toBe(false)
  }, 120_000)
})
