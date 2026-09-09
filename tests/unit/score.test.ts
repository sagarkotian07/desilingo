import { describe, it, expect } from 'vitest'
import { scorePronunciation, type Verdict } from '@/lib/scoring/score'
import type { LangCode } from '@/lib/languages'

/**
 * The calibration table.
 *
 * Assertions are on bands and on pass/fail, never on exact scores — the numbers
 * will drift as the cost matrix is tuned, and pinning them would make this file
 * a maintenance tax instead of a safety net.
 *
 * Every false negative found in real use should be added here as a row.
 */

interface Row {
  name: string
  target: string
  heard: string
  lang?: LangCode
  expect: Verdict | Verdict[]
  passes: boolean
  detected?: string
  rmsPeak?: number
}

const rows: Row[] = [
  // --- said correctly, in one form or another --------------------------------
  { name: 'exact match', target: 'नहीं चाहिए', heard: 'नहीं चाहिए', expect: 'perfect', passes: true },
  { name: 'trailing danda that STT adds and content lacks', target: 'नहीं चाहिए', heard: 'नहीं चाहिए।', expect: 'perfect', passes: true },
  { name: 'anusvara spelling variant', target: 'हिंदी', heard: 'हिन्दी', expect: 'perfect', passes: true },
  { name: 'nukta variation a learner cannot hear', target: 'ज़रूरी', heard: 'जरूरी', expect: 'perfect', passes: true },
  { name: 'candrabindu vs anusvara', target: 'हाँ', heard: 'हां', expect: 'perfect', passes: true },

  // --- near misses: pass, but show the diff ----------------------------------
  { name: 'dropped nasal', target: 'नहीं चाहिए', heard: 'नही चाहिए', expect: ['perfect', 'good'], passes: true },
  { name: 'orthographic variant ये/ए', target: 'नहीं चाहिए', heard: 'नहीं चाहिये', expect: ['perfect', 'good'], passes: true },
  { name: 'lost aspiration', target: 'नहीं चाहिए', heard: 'नहीं चाहिक', expect: ['good', 'close'], passes: true },
  { name: 'STT hallucinated a filler word', target: 'नहीं चाहिए', heard: 'नहीं चाहिए जी', expect: ['perfect', 'good'], passes: true },
  { name: 'one wrong consonant in a short word', target: 'चलो', heard: 'कलो', expect: ['good', 'close'], passes: true },

  // --- genuinely wrong: must NOT pass ----------------------------------------
  {
    name: 'semantic opposite — "yes" for "no" must never pass on the strength of the other word',
    target: 'नहीं चाहिए', heard: 'हाँ चाहिए', expect: ['retry', 'try-again'], passes: false,
  },
  { name: 'dropped a whole word', target: 'नहीं चाहिए', heard: 'नहीं', expect: ['retry', 'try-again'], passes: false },
  { name: 'entirely different phrase', target: 'नहीं चाहिए', heard: 'मुझे पानी दो', expect: 'try-again', passes: false },
  { name: 'unrelated short word', target: 'चलो', heard: 'बड़ा', expect: 'try-again', passes: false },

  // --- not the learner's fault ----------------------------------------------
  { name: 'nothing transcribed', target: 'नहीं चाहिए', heard: '', expect: 'not-heard', passes: false },
  { name: 'mic was silent', target: 'नहीं चाहिए', heard: 'नहीं चाहिए', rmsPeak: 0.001, expect: 'not-heard', passes: false },
  { name: 'answered in English', target: 'नहीं चाहिए', heard: 'I do not want it', detected: 'en-IN', expect: 'wrong-language', passes: false },

  // --- other scripts ---------------------------------------------------------
  { name: 'Kannada exact', target: 'ನಮಸ್ಕಾರ', heard: 'ನಮಸ್ಕಾರ', lang: 'kn', expect: 'perfect', passes: true },
  { name: 'Tamil exact', target: 'வணக்கம்', heard: 'வணக்கம்', lang: 'ta', expect: 'perfect', passes: true },
  { name: 'Telugu with trailing punctuation', target: 'నమస్కారం', heard: 'నమస్కారం.', lang: 'te', expect: 'perfect', passes: true },
  { name: 'Bengali exact', target: 'নমস্কার', heard: 'নমস্কার', lang: 'bn', expect: 'perfect', passes: true },
]

describe('scorePronunciation calibration', () => {
  for (const r of rows) {
    it(r.name, () => {
      const res = scorePronunciation({
        target: r.target, transcript: r.heard, lang: r.lang ?? 'hi',
        detectedLanguage: r.detected, rmsPeak: r.rmsPeak,
      })
      const allowed = Array.isArray(r.expect) ? r.expect : [r.expect]
      expect(allowed, `verdict was ${res.verdict} (score ${res.score.toFixed(3)})`).toContain(res.verdict)
      expect(res.passed).toBe(r.passes)
    })
  }
})

describe('feedback quality', () => {
  it('always reports what was heard, so a learner can see an STT error for what it is', () => {
    const r = scorePronunciation({ target: 'नहीं चाहिए', transcript: 'मुझे पानी दो', lang: 'hi' })
    expect(r.heardTranscript).toBe('मुझे पानी दो')
  })

  it('identifies which word was wrong rather than just returning a number', () => {
    const r = scorePronunciation({ target: 'नहीं चाहिए', transcript: 'हाँ चाहिए', lang: 'hi' })
    const bad = r.words.find((w) => w.op !== 'match')
    expect(bad?.target).toBe('नहीं')
    expect(bad?.heard).toBe('हाँ')
    expect(r.words.find((w) => w.op === 'match')?.target).toBe('चाहिए')
  })

  it('marks an unheard word as a deletion rather than a substitution', () => {
    const r = scorePronunciation({ target: 'नहीं चाहिए', transcript: 'नहीं', lang: 'hi' })
    expect(r.words.find((w) => w.target === 'चाहिए')?.op).toBe('delete')
  })
})
