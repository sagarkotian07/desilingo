/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'

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

const { importProgress, resetProgress } = await import('@/lib/progress')
const { LessonPath } = await import('@/app/[lang]/learn/LessonPath')

const units = [
  {
    id: 'unit-1', title: 'Everyday Responses', emoji: '💬',
    lessons: [
      { id: 'l1', title: 'Saying Yes & No', count: 6, scene: false },
      { id: 'l2', title: 'Quick Replies', count: 6, scene: false },
      { id: 's1', title: 'A cup of chai', count: 6, scene: true },
    ],
  },
  {
    id: 'unit-2', title: 'Out and About', emoji: '🛺',
    lessons: [{ id: 'l3', title: 'At the Market', count: 6, scene: false }],
  },
]

function done(...ids: string[]) {
  const lessons = Object.fromEntries(ids.map((id) => [id, { accuracy: 1, xp: 17, completedAt: '2026-01-01' }]))
  importProgress('hi', JSON.stringify({ lessons, totalXP: 0, streak: 0, lastPlayed: null }))
}

beforeEach(() => { storage.clear(); resetProgress('hi') })
afterEach(cleanup)

describe('LessonPath scenes', () => {
  it("stay locked until the unit's lessons are done", () => {
    done('l1')
    render(<LessonPath lang="hi" units={units} />)
    expect(screen.getByLabelText('Scene: A cup of chai, locked')).toBeTruthy()
    expect(screen.queryByRole('link', { name: /Scene/ })).toBeNull()
  })

  it('open once they are', () => {
    done('l1', 'l2')
    render(<LessonPath lang="hi" units={units} />)
    expect(screen.getByRole('link', { name: 'Scene: A cup of chai' }).getAttribute('href')).toBe('/hi/lesson/s1')
  })

  it('hold the next unit until played', () => {
    done('l1', 'l2')
    render(<LessonPath lang="hi" units={units} />)
    expect(screen.getByLabelText('Lesson 3: At the Market, locked')).toBeTruthy()
  })

  it('stay played once played, even if reached early', () => {
    done('l1', 's1')
    render(<LessonPath lang="hi" units={units} />)
    expect(screen.getByRole('link', { name: 'Scene: A cup of chai, complete' })).toBeTruthy()
  })

  it('are named, not numbered', () => {
    done('l1', 'l2', 's1')
    render(<LessonPath lang="hi" units={units} />)
    expect(screen.getByRole('link', { name: 'Lesson 3: At the Market' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Scene: A cup of chai, complete' })).toBeTruthy()
  })
})
