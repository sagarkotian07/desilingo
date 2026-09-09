import { describe, it, expect } from 'vitest'
import { romanMatches } from '@/lib/scoring/roman'

describe('romanMatches', () => {
  it('accepts the canonical spelling', () => {
    expect(romanMatches('Nahin chahiye', 'Nahin chahiye')).toBe(true)
  })

  it('accepts the reasonable spellings a learner will actually type', () => {
    for (const typed of ['nahi chahiye', 'nahee chahiye', 'nahin chahiye', 'Nahin Chahiye!']) {
      expect(romanMatches(typed, 'Nahin chahiye'), typed).toBe(true)
    }
  })

  it('ignores punctuation and case', () => {
    expect(romanMatches('kya haal hai', 'Kya haal hai?')).toBe(true)
  })

  it('still rejects a different phrase', () => {
    expect(romanMatches('shukriya', 'Nahin chahiye')).toBe(false)
    expect(romanMatches('paani', 'Chalo')).toBe(false)
  })

  it('rejects an empty answer', () => {
    expect(romanMatches('', 'Chalo')).toBe(false)
  })
})
