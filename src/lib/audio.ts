import { createHash } from 'node:crypto'
import type { LangCode } from './languages'

/** Sarvam TTS settings. Baked into the audio key, so changing any of them
 *  produces new filenames rather than silently serving stale audio. */
export const TTS_MODEL = 'bulbul:v3'
export const TTS_SAMPLE_RATE = 24000
export const TTS_CODEC = 'mp3'

export const PACE_NORMAL = 1.0
/** Sarvam re-times the synthesis with correct prosody. Using the browser's
 *  playbackRate instead smears aspirated stops and geminates — exactly the
 *  detail a learner is straining to hear. 0.75 rather than 0.7: bulbul:v3
 *  starts sounding unnatural below that. */
export const PACE_SLOW = 0.75

export interface AudioKeyInput {
  lang: LangCode
  text: string
  speaker: string
  pace: number
  model?: string
}

/**
 * Content-addressed key for one clip. Hashes the WHOLE tuple, not just the text:
 * if we ever change speaker or model, every affected file gets a new name and
 * the CDN can't serve us the old voice forever.
 */
export function audioKey(input: AudioKeyInput): string {
  const { lang, text, speaker, pace, model = TTS_MODEL } = input
  return createHash('sha256')
    .update(`${lang}|${text}|${speaker}|${model}|${pace}`)
    .digest('hex')
    .slice(0, 16)
}

/** Public URL of a clip. Filenames are immutable, so these are cached forever
 *  (see the cacheControl rule in vercel.ts). */
export function audioPath(lang: LangCode, key: string): string {
  return `/audio/${lang}/${key}.mp3`
}

export interface ManifestEntry {
  lang: LangCode
  text: string
  pace: number
  speaker: string
  /** Roman transliteration, fetched once at build time. */
  roman?: string
  bytes: number
}

export type AudioManifest = Record<string, ManifestEntry>
