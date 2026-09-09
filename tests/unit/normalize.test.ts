import { describe, it, expect } from 'vitest'
import { normalizeIndic, foldOrthography, normalizeForCompare, graphemes, words } from '@/lib/scoring/normalize'

describe('normalizeIndic (compare)', () => {
  it('strips the danda Sarvam appends but our content lacks', () => {
    expect(normalizeForCompare('नमस्ते।', 'hi')).toBe(normalizeForCompare('नमस्ते', 'hi'))
  })

  it('strips Latin punctuation — the reference app did not, so a missing "?" cost marks', () => {
    expect(normalizeForCompare('आज कैसे हैं आप?', 'hi')).toBe(normalizeForCompare('आज कैसे हैं आप', 'hi'))
  })

  it('strips ZWNJ/ZWJ, which change shaping but never pronunciation', () => {
    expect(normalizeForCompare('क्‌ष', 'hi')).toBe(normalizeForCompare('क्ष', 'hi'))
  })

  it('folds native digits to ASCII in every script', () => {
    expect(normalizeForCompare('५', 'hi')).toBe('5')
    expect(normalizeForCompare('৫', 'bn')).toBe('5')
    expect(normalizeForCompare('௫', 'ta')).toBe('5')
    expect(normalizeForCompare('౫', 'te')).toBe('5')
    expect(normalizeForCompare('೫', 'kn')).toBe('5')
  })

  it('collapses whitespace and trims', () => {
    expect(normalizeForCompare('  नमस्ते   जी  ', 'hi')).toBe('नमस्ते जी')
  })

  it('display level keeps punctuation', () => {
    expect(normalizeIndic('नमस्ते।', 'hi', 'display')).toBe('नमस्ते।')
  })
})

describe('foldOrthography', () => {
  it('treats हिन्दी and हिंदी as the same word — both are correct spellings', () => {
    expect(normalizeForCompare('हिन्दी', 'hi')).toBe(normalizeForCompare('हिंदी', 'hi'))
  })

  it('folds homorganic nasal conjuncts in Kannada too (offset arithmetic holds)', () => {
    // ಂ anusvara vs ನ್ (na + virama)
    expect(foldOrthography('ಕನ್ನಡ', 'kn')).toBe(foldOrthography('ಕಂನಡ', 'kn'))
  })

  it('folds candrabindu to anusvara', () => {
    expect(normalizeForCompare('हाँ', 'hi')).toBe(normalizeForCompare('हां', 'hi'))
  })

  it('drops nukta — a learner cannot hear ज़ vs ज', () => {
    expect(normalizeForCompare('ज़रूरी', 'hi')).toBe(normalizeForCompare('जरूरी', 'hi'))
  })

  it('handles precomposed vs decomposed nukta identically (NFC exclusion list)', () => {
    expect(normalizeForCompare('ज़', 'hi')).toBe(normalizeForCompare('ज़', 'hi'))
  })

  it('treats Bengali khanda ta as ত্', () => {
    expect(normalizeForCompare('ৎ', 'bn')).toBe(normalizeForCompare('ত্', 'bn'))
  })
})

describe('graphemes', () => {
  it('clusters conjuncts as single units (UAX #29 GB9c)', () => {
    expect(graphemes('क्षि', 'hi')).toHaveLength(1)
    expect(graphemes('नमस्ते', 'hi')).toEqual(['न', 'म', 'स्ते'])
  })

  // ICU applies the GB9c conjunct rule to Devanagari and Telugu but not to
  // Kannada or Tamil, whose virama stays attached to the preceding consonant
  // instead of joining across it. Both behaviours are stable, which is all the
  // edit distance needs — target and transcript cluster the same way.
  it('clusters Telugu conjuncts', () => {
    expect(graphemes('నమస్కారం', 'te')).toEqual(['న', 'మ', 'స్కా', 'రం'])
  })

  it('keeps Kannada and Tamil viramas attached without joining across', () => {
    expect(graphemes('ಕನ್ನಡ', 'kn')).toEqual(['ಕ', 'ನ್', 'ನ', 'ಡ'])
    expect(graphemes('வணக்கம்', 'ta')).toEqual(['வ', 'ண', 'க்', 'க', 'ம்'])
  })

  it('is lossless in every script — clusters always rejoin to the input', () => {
    const cases = [['hi', 'नमस्ते जी'], ['kn', 'ಕನ್ನಡ'], ['ta', 'வணக்கம்'],
                   ['te', 'నమస్కారం'], ['bn', 'নমস্কার'], ['mr', 'नमस्कार']] as const
    for (const [lang, text] of cases) {
      expect(graphemes(text, lang).join('')).toBe(text)
    }
  })
})

describe('words', () => {
  it('splits on whitespace after normalizing', () => {
    expect(words('नहीं चाहिए।', 'hi')).toEqual(['नहीं', 'चाहिए'])
  })
  it('returns empty for blank input', () => {
    expect(words('   ', 'hi')).toEqual([])
  })
})
