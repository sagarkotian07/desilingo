import { LANGUAGE_CONFIG, type LangCode } from '@/lib/languages'
import { normalizeIndic } from './normalize'

/**
 * A rough phonemic transcription, computed locally.
 *
 * This is the "spelled differently but sounds the same" rescue. Sarvam has a
 * /transliterate endpoint that would do a better job, but calling it here would
 * put a paid network round-trip on the hot path while the learner stares at a
 * spinner waiting to find out whether they said it right. This runs in
 * microseconds and costs nothing.
 *
 * One table serves all six languages: the scripts are ISCII-derived and place the
 * same letter at the same offset from their base. Tamil simply never uses the
 * voiced and aspirated slots, which is correct — its script cannot express them,
 * so both target and transcript are written the same way regardless.
 */

const CONSONANTS: Record<number, string> = {
  0x15: 'k',  0x16: 'kh', 0x17: 'g',  0x18: 'gh', 0x19: 'ng',
  0x1a: 'c',  0x1b: 'ch', 0x1c: 'j',  0x1d: 'jh', 0x1e: 'ny',
  0x1f: 'T',  0x20: 'Th', 0x21: 'D',  0x22: 'Dh', 0x23: 'N',
  0x24: 't',  0x25: 'th', 0x26: 'd',  0x27: 'dh', 0x28: 'n',
  0x29: 'n',  // Tamil ன (alveolar)
  0x2a: 'p',  0x2b: 'ph', 0x2c: 'b',  0x2d: 'bh', 0x2e: 'm',
  0x2f: 'y',  0x30: 'r',  0x31: 'R',  // Tamil ற
  0x32: 'l',  0x33: 'L',  0x34: 'zh', // Tamil ழ
  0x35: 'v',
  0x36: 'sh', 0x37: 'sh', 0x38: 's',  0x39: 'h',
}

/** Independent vowels. */
const VOWELS: Record<number, string> = {
  0x05: 'a',  0x06: 'aa', 0x07: 'i',  0x08: 'ii', 0x09: 'u', 0x0a: 'uu',
  0x0b: 'ri', 0x0e: 'e',  0x0f: 'ee', 0x10: 'ai',
  0x12: 'o',  0x13: 'oo', 0x14: 'au',
}

/** Dependent vowel signs (matras), which replace a consonant's inherent 'a'.
 *  Short e/o (0x46, 0x4a) exist in the Dravidian scripts but not in Devanagari,
 *  and are kept distinct from their long counterparts because the contrast is
 *  phonemic in Tamil, Telugu and Kannada. */
const MATRAS: Record<number, string> = {
  0x3e: 'aa', 0x3f: 'i',  0x40: 'ii', 0x41: 'u',  0x42: 'uu', 0x43: 'ri',
  0x46: 'e',  0x47: 'ee', 0x48: 'ai',
  0x4a: 'o',  0x4b: 'oo', 0x4c: 'au',
}

const VIRAMA = 0x4d
const ANUSVARA = 0x02
const CANDRABINDU = 0x01
const VISARGA = 0x03

/** Space-separated phonemes, e.g. नमस्ते -> "n a m a s t ee". */
export function phonemize(text: string, lang: LangCode): string {
  const base = LANGUAGE_CONFIG[lang].scriptBase
  const src = normalizeIndic(text, lang, 'compare')
  const out: string[] = []
  let pending: string | null = null // inherent or explicit vowel awaiting emission

  const flush = () => {
    if (pending) out.push(pending)
    pending = null
  }

  for (const chr of src) {
    if (chr === ' ') { flush(); out.push('|'); continue }
    const o = chr.codePointAt(0)! - base

    if (CONSONANTS[o] !== undefined) {
      flush()
      out.push(CONSONANTS[o])
      pending = 'a' // inherent vowel, overwritten by a matra or killed by virama
    } else if (MATRAS[o] !== undefined) {
      pending = MATRAS[o]
    } else if (o === VIRAMA) {
      pending = null
    } else if (VOWELS[o] !== undefined) {
      flush()
      out.push(VOWELS[o])
    } else if (o === ANUSVARA || o === CANDRABINDU) {
      flush()
      out.push('n')
    } else if (o === VISARGA) {
      flush()
      out.push('h')
    } else if (/[a-z0-9]/.test(chr)) {
      // Code-mixed Latin that STT emitted verbatim.
      flush()
      out.push(chr)
    }
  }
  flush()
  return out.join(' ').replace(/\s*\|\s*/g, ' | ').trim()
}
