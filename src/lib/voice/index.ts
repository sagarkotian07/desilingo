import { sarvam } from './sarvam'
import { mockVoice } from './mock'
import type { VoiceProvider } from './types'

/**
 * Provider selection.
 *
 * `MOCK_VOICE=1` swaps Sarvam for an offline stand-in so UI work costs nothing
 * and runs without an API key. Everything downstream talks to this, never to a
 * provider module directly, which is what makes the seam real rather than
 * decorative.
 */
export function voiceProvider(): VoiceProvider {
  return process.env.MOCK_VOICE === '1' ? mockVoice : sarvam
}

export type { VoiceProvider } from './types'
