import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Rename migration: indiligo:progress:* -> desilingo:progress:*
 *
 * This is the one change in the rename that can silently destroy data. Without
 * the migration the old entries stay in localStorage under a name nothing reads,
 * so every existing learner appears to have lost all their progress.
 *
 * Uses a fresh module instance per test because the store caches snapshots, and
 * a cached snapshot would mask whether the migration actually ran.
 */

class MemoryStorage {
  m = new Map<string, string>()
  getItem(k: string) { return this.m.get(k) ?? null }
  setItem(k: string, v: string) { this.m.set(k, v) }
  removeItem(k: string) { this.m.delete(k) }
  clear() { this.m.clear() }
  key() { return null }
  get length() { return this.m.size }
}

const storage = new MemoryStorage()
vi.stubGlobal('localStorage', storage)
vi.stubGlobal('window', { addEventListener() {}, removeEventListener() {} })

const LEGACY = 'indiligo:progress:hi'
const CURRENT = 'desilingo:progress:hi'

const sample = JSON.stringify({
  lessons: { 'lesson-1-1': { accuracy: 1, xp: 17, completedAt: '2026-09-10' } },
  totalXP: 17, streak: 3, lastPlayed: '2026-09-10',
})

async function freshStore() {
  vi.resetModules()
  return import('@/lib/progress')
}

beforeEach(() => storage.clear())

describe('legacy progress migration', () => {
  it('carries progress over from the old key', async () => {
    storage.setItem(LEGACY, sample)
    const { exportProgress } = await freshStore()
    const p = JSON.parse(exportProgress('hi'))
    expect(p.totalXP).toBe(17)
    expect(p.lessons['lesson-1-1'].xp).toBe(17)
  })

  it('writes the data under the new key and removes the old one', async () => {
    storage.setItem(LEGACY, sample)
    const { exportProgress } = await freshStore()
    exportProgress('hi') // triggers the read
    expect(storage.getItem(CURRENT)).not.toBeNull()
    expect(storage.getItem(LEGACY)).toBeNull()
  })

  it('prefers current data and does not clobber it with the legacy copy', async () => {
    storage.setItem(LEGACY, sample)
    storage.setItem(CURRENT, JSON.stringify({ lessons: {}, totalXP: 99, streak: 1, lastPlayed: '2026-09-12' }))
    const { exportProgress } = await freshStore()
    expect(JSON.parse(exportProgress('hi')).totalXP).toBe(99)
  })

  it('is a no-op for a brand-new learner', async () => {
    const { exportProgress } = await freshStore()
    expect(JSON.parse(exportProgress('hi')).totalXP).toBe(0)
    expect(storage.getItem(CURRENT)).toBeNull()
  })

  it('migrates each language independently', async () => {
    storage.setItem('indiligo:progress:ta', JSON.stringify({ lessons: {}, totalXP: 8, streak: 2, lastPlayed: '2026-09-10' }))
    const { exportProgress } = await freshStore()
    expect(JSON.parse(exportProgress('ta')).totalXP).toBe(8)
    expect(JSON.parse(exportProgress('hi')).totalXP).toBe(0)
  })

  it('survives corrupt legacy data rather than throwing', async () => {
    storage.setItem(LEGACY, 'not json at all')
    const { exportProgress } = await freshStore()
    expect(JSON.parse(exportProgress('hi')).totalXP).toBe(0)
  })
})
