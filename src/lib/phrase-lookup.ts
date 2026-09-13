import manifest from '@/generated/audio-manifest.json'
import type { AudioManifest } from './audio'
import type { LangCode } from './languages'

/**
 * Server-side phrase allowlist.
 *
 * Both paid routes resolve what to work on from a content-addressed key rather
 * than trusting text from the request. That makes the set of things a caller can
 * ask us to spend money on exactly the set of phrases we ship.
 */
const CLIPS = manifest as AudioManifest

export interface Phrase {
  key: string
  lang: LangCode
  text: string
  pace: number
  speaker: string
}

export function resolvePhrase(key: string): Phrase | null {
  const entry = CLIPS[key]
  if (!entry) return null
  return { key, lang: entry.lang, text: entry.text, pace: entry.pace, speaker: entry.speaker }
}
