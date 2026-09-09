import { describe, it, expect } from 'vitest'
import { phonemize } from '@/lib/scoring/phonemize'

describe('phonemize', () => {
  it('handles inherent vowels, matras and virama', () => {
    expect(phonemize('नमस्ते', 'hi')).toBe('n a m a s t ee')
    expect(phonemize('नमस्कार', 'hi')).toBe('n a m a s k aa r a')
  })

  // The offset table is shared across scripts, so the same word written in
  // different scripts must come out identically. This is the load-bearing test
  // for the ISCII-offset assumption the whole phonemizer rests on.
  it('is script-independent for the same word', () => {
    const hi = phonemize('नमस्कार', 'hi')
    expect(phonemize('ನಮಸ್ಕಾರ', 'kn')).toBe(hi)
    expect(phonemize('నమస్కార', 'te')).toBe(hi)
    expect(phonemize('নমস্কার', 'bn')).toBe(hi)
    expect(phonemize('नमस्कार', 'mr')).toBe(hi)
  })

  it('maps anusvara and candrabindu to a nasal', () => {
    expect(phonemize('हाँ', 'hi')).toBe('h aa n')
    expect(phonemize('हां', 'hi')).toBe('h aa n')
  })

  it('keeps word boundaries', () => {
    expect(phonemize('नहीं चाहिए', 'hi')).toBe('n a h ii n | c aa h i ee')
  })

  it('handles Tamil, which lacks voiced and aspirated series', () => {
    expect(phonemize('வணக்கம்', 'ta')).toBe('v a N a k k a m')
  })

  it('distinguishes vowel length, which is a real learning target', () => {
    expect(phonemize('दिन', 'hi')).not.toBe(phonemize('दीन', 'hi'))
  })

  it('passes through code-mixed Latin that STT emits verbatim', () => {
    expect(phonemize('मेरा phone', 'hi')).toContain('p h o n e')
  })
})
