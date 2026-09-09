import { LANGUAGE_CONFIG, type LangCode } from '@/lib/languages'
import { TTS_MODEL, TTS_SAMPLE_RATE, TTS_CODEC, PACE_NORMAL } from '@/lib/audio'
import {
  VoiceError,
  type SynthesizeRequest, type TranscribeRequest, type TranscribeResult,
  type TranslateRequest, type VoiceProvider,
} from './types'

/**
 * Sarvam AI client.
 *
 * Deliberately plain fetch rather than the official `sarvamai` SDK: we want
 * control over AbortSignal, retry classification and error mapping, we avoid the
 * SDK's camelCase-constructor / snake_case-body split, and an npm minor version
 * cannot silently reshape our requests.
 *
 * Field names are current as of bulbul:v3 / saaras:v4 and differ from a lot of
 * older example code: the TTS language field is `language_code`, NOT
 * `target_language_code`, and the STT model family is `saaras`, not `saarika`.
 */

const BASE = 'https://api.sarvam.ai'
const TIMEOUT_MS = 15_000

/** STT model. saaras:v4 is the current generation. */
export const STT_MODEL = 'saaras:v4'

function apiKey(): string {
  const key = process.env.SARVAM_API_KEY
  if (!key) {
    throw new VoiceError(
      'SARVAM_API_KEY is not set. Copy .env.example to .env.local and add your key.',
      0, false,
    )
  }
  return key
}

function assertEnabled() {
  if (process.env.SARVAM_ENABLED === '0') {
    throw new VoiceError('Sarvam access is disabled (SARVAM_ENABLED=0).', 503, false)
  }
}

/** Sarvam returns 403 rather than 401 for a bad key. */
async function toError(res: Response): Promise<VoiceError> {
  let detail = ''
  try {
    const body = await res.text()
    detail = body.slice(0, 300)
  } catch { /* body already consumed or unreadable */ }

  if (res.status === 403) {
    return new VoiceError(`Sarvam rejected the API key (403). ${detail}`, 403, false)
  }
  if (res.status === 429) {
    const retryAfter = Number(res.headers.get('retry-after'))
    return new VoiceError(
      `Sarvam rate limit hit (429). ${detail}`, 429, true,
      Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : undefined,
    )
  }
  if (res.status >= 500) {
    return new VoiceError(`Sarvam server error (${res.status}). ${detail}`, res.status, true)
  }
  return new VoiceError(`Sarvam request failed (${res.status}). ${detail}`, res.status, false)
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  assertEnabled()
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'api-subscription-key': apiKey(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  if (!res.ok) throw await toError(res)
  return res.json() as Promise<T>
}

export const sarvam: VoiceProvider = {
  name: 'sarvam',

  async synthesize({ text, lang, pace = PACE_NORMAL, speaker }: SynthesizeRequest) {
    const cfg = LANGUAGE_CONFIG[lang]
    const json = await postJson<{ request_id: string; audios: string[] }>('/text-to-speech', {
      text,
      language_code: cfg.sarvam,
      model: TTS_MODEL,
      speaker: speaker ?? cfg.speaker,
      pace,
      speech_sample_rate: TTS_SAMPLE_RATE,
      output_audio_codec: TTS_CODEC,
    })
    if (!json.audios?.length) {
      throw new VoiceError('Sarvam returned no audio', 502, true)
    }
    // The response is an array of base64 chunks; the documented handling is to
    // join before decoding.
    const bytes = Buffer.from(json.audios.join(''), 'base64')
    return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
  },

  async transcribe({ audio, lang, filename = 'attempt.webm' }: TranscribeRequest) {
    assertEnabled()
    const form = new FormData()
    // The extension matters: Sarvam infers the container from the filename.
    form.append('file', audio, filename)
    form.append('model', STT_MODEL)
    form.append('mode', 'transcribe')
    form.append('language_code', LANGUAGE_CONFIG[lang].sarvam)

    const res = await fetch(`${BASE}/speech-to-text`, {
      method: 'POST',
      headers: { 'api-subscription-key': apiKey() },
      body: form,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    if (!res.ok) throw await toError(res)
    const json = (await res.json()) as { transcript: string; language_code?: string }
    return { transcript: json.transcript ?? '', detectedLanguage: json.language_code }
  },

  async translate({ text, from, to, script = 'native' }: TranslateRequest) {
    const code = (l: LangCode | 'en') => (l === 'en' ? 'en-IN' : LANGUAGE_CONFIG[l].sarvam)
    const json = await postJson<{ translated_text: string }>('/translate', {
      input: text,
      source_language_code: code(from),
      target_language_code: code(to),
      model: 'mayura:v1',
      // Colloquial register: this app teaches how people actually speak, and the
      // default 'formal' mode produces stilted textbook phrasing.
      mode: 'modern-colloquial',
      output_script: script === 'roman' ? 'roman' : 'fully-native',
    })
    return json.translated_text
  },

  async transliterate(text: string, lang: LangCode) {
    const json = await postJson<{ transliterated_text: string }>('/transliterate', {
      input: text,
      source_language_code: LANGUAGE_CONFIG[lang].sarvam,
      target_language_code: 'en-IN',
      // Spells out numerals the way they're said, which is what a learner needs.
      spoken_form: true,
    })
    return json.transliterated_text
  },
}
