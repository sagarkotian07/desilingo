import { LANGUAGE_CONFIG } from '@/lib/languages'
import type {
  TranscribeRequest, TranscribeResult, TranslateRequest, VoiceProvider,
} from './types'

/**
 * Offline stand-in for Sarvam, selected with MOCK_VOICE=1.
 *
 * Exists so day-to-day UI work costs nothing and needs no API key. It is
 * deliberately deterministic rather than clever: every response is derived from
 * the input, so screenshots and tests don't drift.
 *
 * What it cannot do: tell you whether pronunciation scoring is *correct*. It
 * returns what it was told to expect, so it exercises the UI path, not the
 * model. Use the live suite (SARVAM_LIVE=1) for that.
 */

/** 200 ms of silence as a valid 16 kHz mono WAV. */
function silentWav(ms = 200): ArrayBuffer {
  const rate = 16000
  const frames = Math.round((rate * ms) / 1000)
  const buffer = new ArrayBuffer(44 + frames * 2)
  const view = new DataView(buffer)
  const w = (o: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i))
  }
  w(0, 'RIFF'); view.setUint32(4, 36 + frames * 2, true); w(8, 'WAVE')
  w(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true)
  view.setUint16(22, 1, true); view.setUint32(24, rate, true)
  view.setUint32(28, rate * 2, true); view.setUint16(32, 2, true)
  view.setUint16(34, 16, true); w(36, 'data'); view.setUint32(40, frames * 2, true)
  return buffer
}

export const mockVoice: VoiceProvider = {
  name: 'mock',

  async synthesize() {
    return silentWav()
  },

  async transcribe({ lang, expect }: TranscribeRequest): Promise<TranscribeResult> {
    return {
      // Echo the target so the happy path renders. Without an `expect` there is
      // nothing honest to return, so we say we heard nothing rather than invent
      // a transcript.
      transcript: expect ?? '',
      detectedLanguage: LANGUAGE_CONFIG[lang].sarvam,
    }
  },

  async translate({ text, script }: TranslateRequest) {
    return script === 'roman' ? `[roman] ${text}` : `[translated] ${text}`
  },

  async transliterate(text: string) {
    return `[roman] ${text}`
  },
}
