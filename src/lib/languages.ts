/**
 * The six languages Indiligo teaches, and everything that varies between them.
 *
 * Sarvam's bulbul:v3 TTS covers 11 Indian languages; all six of ours are in that
 * set. Speakers are not language-bound — any speaker can read any language — so
 * the choices below are aesthetic and were picked by ear during generation.
 */

export const LANGUAGES = ['hi', 'kn', 'ta', 'te', 'bn', 'mr'] as const
export type LangCode = (typeof LANGUAGES)[number]

/** Sarvam's language identifiers. Note: Odia is `od-IN` on REST but `or-IN` on
 *  the realtime websocket. We don't teach Odia, but the inconsistency is real. */
export type SarvamLang = 'hi-IN' | 'kn-IN' | 'ta-IN' | 'te-IN' | 'bn-IN' | 'mr-IN'

/** bulbul:v3 speakers, lowercase — the API rejects other casing. */
export type Speaker =
  | 'ritu' | 'kavya' | 'shruti' | 'roopa' | 'ishita' | 'rupali'
  | 'priya' | 'neha' | 'shreya' | 'tanya' | 'suhani' | 'kavitha'

export interface LanguageConfig {
  code: LangCode
  sarvam: SarvamLang
  /** BCP-47 tag, used for Intl.Segmenter grapheme clustering. */
  bcp47: string
  englishName: string
  nativeName: string
  /** Native-script greeting, shown on the language picker. */
  greeting: string
  /** Native-script "well done", shown on lesson completion. */
  wellDone: string
  speaker: Speaker
  /** Google Font family for this script. */
  font: string
  emoji: string
  /** Unicode block start, used by the phonemizer's offset arithmetic.
   *  Tamil is handled by a separate table and ignores this. */
  scriptBase: number
}

export const LANGUAGE_CONFIG: Record<LangCode, LanguageConfig> = {
  hi: {
    code: 'hi', sarvam: 'hi-IN', bcp47: 'hi-IN',
    englishName: 'Hindi', nativeName: 'हिंदी',
    greeting: 'नमस्ते', wellDone: 'शाबाश!',
    speaker: 'ritu', font: 'Noto Sans Devanagari', emoji: '🪔',
    scriptBase: 0x0900,
  },
  kn: {
    code: 'kn', sarvam: 'kn-IN', bcp47: 'kn-IN',
    englishName: 'Kannada', nativeName: 'ಕನ್ನಡ',
    greeting: 'ನಮಸ್ಕಾರ', wellDone: 'ಭೇಷ್!',
    speaker: 'kavya', font: 'Noto Sans Kannada', emoji: '🌺',
    scriptBase: 0x0C80,
  },
  ta: {
    code: 'ta', sarvam: 'ta-IN', bcp47: 'ta-IN',
    englishName: 'Tamil', nativeName: 'தமிழ்',
    greeting: 'வணக்கம்', wellDone: 'அருமை!',
    speaker: 'shruti', font: 'Noto Sans Tamil', emoji: '🌴',
    scriptBase: 0x0B80,
  },
  te: {
    code: 'te', sarvam: 'te-IN', bcp47: 'te-IN',
    englishName: 'Telugu', nativeName: 'తెలుగు',
    greeting: 'నమస్కారం', wellDone: 'శభాష్!',
    speaker: 'roopa', font: 'Noto Sans Telugu', emoji: '🌾',
    scriptBase: 0x0C00,
  },
  bn: {
    code: 'bn', sarvam: 'bn-IN', bcp47: 'bn-IN',
    englishName: 'Bengali', nativeName: 'বাংলা',
    greeting: 'নমস্কার', wellDone: 'দারুণ!',
    speaker: 'ishita', font: 'Noto Sans Bengali', emoji: '🐟',
    scriptBase: 0x0980,
  },
  mr: {
    code: 'mr', sarvam: 'mr-IN', bcp47: 'mr-IN',
    englishName: 'Marathi', nativeName: 'मराठी',
    greeting: 'नमस्कार', wellDone: 'शाब्बास!',
    speaker: 'rupali', font: 'Noto Sans Devanagari', emoji: '🥭',
    scriptBase: 0x0900,
  },
}

export function isLangCode(v: string): v is LangCode {
  return (LANGUAGES as readonly string[]).includes(v)
}
