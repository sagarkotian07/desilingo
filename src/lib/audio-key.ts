import { createHash } from 'node:crypto'
import type { LangCode } from './languages'
import { TTS_MODEL } from './audio'

/**
 * Content-addressed clip keys.
 *
 * Server and build-script only: it depends on node:crypto, and pulling that into
 * a client bundle would break the build. The browser resolves clips through the
 * generated manifest instead (see clips.ts), which needs no hashing at all.
 */
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
