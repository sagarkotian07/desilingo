import { LANGUAGE_CONFIG, type LangCode } from '@/lib/languages'

/**
 * Text normalization for Indic scripts.
 *
 * All six of our scripts are ISCII-derived and share a code-point layout: the
 * same letter sits at the same offset from each script's base (Devanagari 0x0900,
 * Bengali 0x0980, Tamil 0x0B80, Telugu 0x0C00, Kannada 0x0C80). So one set of
 * offsets covers every language instead of five hand-written tables.
 */

const OFF = {
  candrabindu: 0x01,  // ँ ঁ ಁ ఁ
  anusvara: 0x02,     // ं ং ಂ ం
  avagraha: 0x3d,     // ऽ
  nukta: 0x3c,        // ़ ়
  virama: 0x4d,       // ् ্ ್ ్ ்
  digitZero: 0x66,    // ० ০ ೦ ౦ ௦
} as const

/** Consonants that assimilate to an anusvara: ङ ञ ण न म and their cognates. */
const NASAL_OFFSETS = [0x19, 0x1e, 0x23, 0x28, 0x2e]

const ch = (base: number, offset: number) => String.fromCodePoint(base + offset)

/** Zero-width and directional marks. ZWJ/ZWNJ change glyph shaping in Devanagari
 *  (क्‌ष vs क्ष) but never change pronunciation, so they go. */
const INVISIBLES = /[​-‏‪-‮⁠-⁯﻿­]/g

/** Danda ।, double danda ॥, abbreviation sign ॰ — shared across Indic scripts —
 *  plus Latin punctuation. Sarvam's STT routinely appends a danda or a question
 *  mark that our content JSON does not have; the app this is modelled on stripped
 *  whitespace but not punctuation, so a missing "?" cost the learner marks. */
const PUNCT = /[।॥॰.,?!;:"'“”‘’\-–—()[\]{}/\\|@#$%^&*_+=~`<>]/g

const segmenters = new Map<string, Intl.Segmenter>()

/** Grapheme clusters, not code points. Node 22 ships ICU >= 74, which implements
 *  UAX #29 GB9c (Indic conjunct break), so क्षि is one cluster and a dropped
 *  matra costs exactly one edit instead of shifting the whole string. */
export function graphemes(s: string, lang: LangCode): string[] {
  const locale = LANGUAGE_CONFIG[lang].bcp47
  let seg = segmenters.get(locale)
  if (!seg) {
    seg = new Intl.Segmenter(locale, { granularity: 'grapheme' })
    segmenters.set(locale, seg)
  }
  return [...seg.segment(s)].map((g) => g.segment)
}

export type NormalizeLevel = 'display' | 'compare'

/**
 * `display` is safe to render; `compare` is for scoring only.
 *
 * NFC, never NFD. The precomposed nukta letters (क़ ख़ ग़ ज़ ड़ ढ़ फ़ य़, U+0958-095F)
 * are on Unicode's composition exclusion list, so NFC *decomposes* them to base +
 * U+093C and leaves them that way — which is exactly what we want, one canonical
 * spelling whichever form Sarvam emits. NFD would additionally split two-part
 * vowel signs (Bengali ো -> U+09C7 U+09BE), which is fine for comparison but
 * wrecks display, and we want one function for both.
 */
export function normalizeIndic(input: string, lang: LangCode, level: NormalizeLevel = 'compare'): string {
  let s = input.normalize('NFC').replace(INVISIBLES, '')

  if (level === 'display') {
    return s.replace(/ /g, ' ').replace(/\s+/g, ' ').trim()
  }

  const base = LANGUAGE_CONFIG[lang].scriptBase
  s = s.replace(PUNCT, ' ')
  s = s.replace(new RegExp(ch(base, OFF.avagraha), 'g'), '')

  // Native digits -> ASCII. STT may return 5 or ५ for the same utterance.
  const zero = base + OFF.digitZero
  s = s.replace(new RegExp(`[${ch(base, OFF.digitZero)}-${String.fromCodePoint(zero + 9)}]`, 'g'), (d) =>
    String(d.codePointAt(0)! - zero),
  )

  // toLowerCase is a no-op for unicase Indic scripts, but STT loves to emit
  // code-mixed English tokens ("OK", "Hello") and those need folding.
  return s.replace(/ /g, ' ').replace(/\s+/g, ' ').trim().toLowerCase()
}

/**
 * Orthographic variants that sound identical. Scoring only — never display.
 *
 * The important rule is the first one: हिन्दी and हिंदी are *both* correct standard
 * spellings of the same word. Without folding them we would tell a learner who
 * said it perfectly that they got it wrong.
 */
export function foldOrthography(input: string, lang: LangCode): string {
  const base = LANGUAGE_CONFIG[lang].scriptBase
  const virama = ch(base, OFF.virama)
  const anusvara = ch(base, OFF.anusvara)
  let s = input

  // Homorganic nasal + virama  ->  anusvara.
  const nasals = NASAL_OFFSETS.map((o) => ch(base, o)).join('')
  s = s.replace(new RegExp(`[${nasals}]${virama}`, 'g'), anusvara)

  // Candrabindu -> anusvara. STT rarely distinguishes them.
  s = s.replace(new RegExp(ch(base, OFF.candrabindu), 'g'), anusvara)

  // Nukta: speakers vary, STT varies, and a learner cannot hear it (ज़ vs ज).
  s = s.replace(new RegExp(ch(base, OFF.nukta), 'g'), '')

  // Bengali khanda ta ৎ is a positional form of ত্.
  if (lang === 'bn') s = s.replace(/ৎ/g, 'ত্')

  return s
}

/** The full scoring pipeline: normalize, then fold. */
export function normalizeForCompare(input: string, lang: LangCode): string {
  return foldOrthography(normalizeIndic(input, lang, 'compare'), lang)
}

export function words(input: string, lang: LangCode): string[] {
  const s = normalizeForCompare(input, lang)
  return s.length ? s.split(' ').filter(Boolean) : []
}

export interface WordToken {
  /** Folded form, used for comparison only. */
  compare: string
  /** What the speaker actually wrote/said, minus punctuation. Shown in the UI:
   *  echoing the folded spelling back at a learner who wrote हाँ as हां is
   *  needlessly confusing. */
  display: string
}

/**
 * Tokenize into display/compare pairs.
 *
 * Both are split from strings that differ only by `foldOrthography`, which never
 * adds or removes whitespace — so the two token lists are guaranteed to line up
 * index for index.
 */
export function wordTokens(input: string, lang: LangCode): WordToken[] {
  const display = normalizeIndic(input, lang, 'compare')
  if (!display.length) return []
  const displayWords = display.split(' ').filter(Boolean)
  const compareWords = foldOrthography(display, lang).split(' ').filter(Boolean)
  return displayWords.map((d, i) => ({ display: d, compare: compareWords[i] ?? d }))
}

/**
 * Share of letters written in this language's script, 0..1.
 *
 * Used to tell "answered in English" apart from "pronounced it badly". We pass
 * an explicit language_code to Sarvam, which suppresses its own language
 * detection, so the field it returns cannot be relied on for this.
 *
 * Honest about the limit: Sarvam often transliterates English INTO the target
 * script ("I do not want it" comes back as आई डू नॉट वांट इट), and no amount of
 * script analysis catches that. Those attempts fall through to a very low
 * similarity score, which is the right outcome anyway -- this check exists for
 * the case where the transcript comes back in Latin letters.
 */
export function targetScriptShare(text: string, lang: LangCode): number {
  const base = LANGUAGE_CONFIG[lang].scriptBase
  let inScript = 0
  let letters = 0
  for (const ch of text) {
    const code = ch.codePointAt(0)!
    const isLatin = (code >= 0x41 && code <= 0x5a) || (code >= 0x61 && code <= 0x7a)
    const isTarget = code >= base && code <= base + 0x7f
    if (!isLatin && !isTarget) continue
    letters++
    if (isTarget) inScript++
  }
  return letters === 0 ? 1 : inScript / letters
}
