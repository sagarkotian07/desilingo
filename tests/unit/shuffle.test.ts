import { describe, it, expect } from 'vitest'
import { seededShuffle, shuffleOptions } from '@/lib/shuffle'

describe('seededShuffle', () => {
  it('is stable for the same seed within a session', () => {
    const items = ['a', 'b', 'c', 'd', 'e']
    expect(seededShuffle(items, 'e1')).toEqual(seededShuffle(items, 'e1'))
  })

  it('differs between seeds', () => {
    const items = Array.from({ length: 12 }, (_, i) => i)
    const a = seededShuffle(items, 'e1')
    const b = seededShuffle(items, 'e2')
    expect(a).not.toEqual(b)
  })

  it('preserves every element', () => {
    const items = ['a', 'b', 'c', 'd']
    expect([...seededShuffle(items, 'x')].sort()).toEqual(['a', 'b', 'c', 'd'])
  })
})

describe('shuffleOptions', () => {
  it('tracks the correct answer to its new position', () => {
    const options = ['right', 'w1', 'w2', 'w3']
    for (const seed of ['a', 'b', 'c', 'd', 'e', 'f']) {
      const r = shuffleOptions(options, 0, seed)
      expect(r.options[r.answer]).toBe('right')
    }
  })

  // The bug this whole module exists to prevent.
  it('does not leave the correct answer at index 0 every time', () => {
    const positions = new Set<number>()
    for (let i = 0; i < 40; i++) {
      positions.add(shuffleOptions(['right', 'a', 'b', 'c'], 0, `ex-${i}`).answer)
    }
    expect(positions.size).toBeGreaterThan(1)
  })
})
