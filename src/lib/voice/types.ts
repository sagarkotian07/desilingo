import type { LangCode } from '@/lib/languages'

export interface SynthesizeRequest {
  text: string
  lang: LangCode
  /** 1.0 normal, 0.75 for slow drill playback. */
  pace?: number
  speaker?: string
}

export interface TranscribeRequest {
  audio: Blob
  lang: LangCode
  filename?: string
}

export interface TranscribeResult {
  transcript: string
  /** Sarvam's own language detection, used to tell "said it in English" apart
   *  from "said it wrong". */
  detectedLanguage?: string
}

export interface TranslateRequest {
  text: string
  from: LangCode | 'en'
  to: LangCode | 'en'
  /** 'roman' returns the translation transliterated into Latin script. */
  script?: 'roman' | 'native'
}

/**
 * The seam between the app and whichever speech vendor is behind it.
 *
 * Sarvam is the only implementation that talks to a network today, with a mock
 * for local development. Keeping the interface means a different provider can be
 * dropped in without touching exercise code -- worth the small indirection given
 * how much of this app's value sits on the far side of it.
 */
export interface VoiceProvider {
  readonly name: string
  synthesize(req: SynthesizeRequest): Promise<ArrayBuffer>
  transcribe(req: TranscribeRequest): Promise<TranscribeResult>
  translate(req: TranslateRequest): Promise<string>
  transliterate(text: string, lang: LangCode): Promise<string>
}

export class VoiceError extends Error {
  constructor(
    message: string,
    readonly status: number,
    /** False for auth failures and malformed requests: retrying just burns time
     *  and, on a rate-limited key, budget. */
    readonly retryable: boolean,
    readonly retryAfterMs?: number,
  ) {
    super(message)
    this.name = 'VoiceError'
  }
}
