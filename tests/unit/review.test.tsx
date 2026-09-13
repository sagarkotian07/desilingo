/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'

vi.mock('@/lib/useAudio', async () => {
  const actual = await vi.importActual<typeof import('@/lib/useAudio')>('@/lib/useAudio')
  return {
    ...actual,
    useAudio: () => ({ play: vi.fn(), stop: vi.fn(), playing: null, blocked: false, isPlaying: false }),
  }
})

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
window.scrollTo = vi.fn() as typeof window.scrollTo

const { getCourse, allLessons } = await import('@/content')
const { buildReviewPool } = await import('@/lib/phrase-memory')
const { importProgress, resetProgress } = await import('@/lib/progress')
const { ReviewSession } = await import('@/app/[lang]/review/ReviewSession')
const { HomeDashboard } = await import('@/app/[lang]/HomeDashboard')

const pool = buildReviewPool(getCourse('hi'))
const lessons = allLessons('hi').map(({ unit, lesson }) => ({
  id: lesson.id, title: lesson.title, unitTitle: unit.title, count: lesson.exercises.length,
}))

// Real course phrases, so the test can't drift from the content's spelling.
const [A, B, C] = Object.keys(pool)
const LONG_AGO = '2020-01-01'
function due(...texts: string[]) {
  const phrases = Object.fromEntries(
    texts.map((t) => [t, { box: 0, due: LONG_AGO, lastSeen: LONG_AGO, seen: 1, misses: 1 }]),
  )
  importProgress('hi', JSON.stringify({ lessons: {}, totalXP: 0, streak: 0, lastPlayed: null, phrases }))
}

const renderHome = () => render(
  <HomeDashboard lang="hi" tagline="" greeting="नमस्ते" glyph="न" englishName="Hindi"
    lessons={lessons} known={Object.keys(pool)} />,
)

beforeEach(() => { storage.clear(); resetProgress('hi') })
afterEach(cleanup)

describe('ReviewSession', () => {
  it('says so when nothing is due', async () => {
    render(<ReviewSession lang="hi" pool={pool} />)
    expect(await screen.findByText('All caught up')).toBeTruthy()
  })

  it('runs the due phrases', async () => {
    due(A, B)
    render(<ReviewSession lang="hi" pool={pool} />)
    expect(await screen.findByText('1/2')).toBeTruthy()
  })
})

describe('Home review card', () => {
  it('appears when phrases are due', () => {
    due(A, B, C)
    renderHome()
    const card = screen.getByRole('link', { name: /Review/ })
    expect(card.getAttribute('href')).toBe('/hi/review')
    expect(card.textContent).toContain('3 phrases · 1 min')
  })

  it('stays away when nothing is due', () => {
    renderHome()
    expect(screen.queryByRole('link', { name: /Review/ })).toBeNull()
  })

  it('ignores phrases the course no longer has', () => {
    due('यह वाक्य हटा दिया गया')
    renderHome()
    expect(screen.queryByRole('link', { name: /Review/ })).toBeNull()
  })
})
