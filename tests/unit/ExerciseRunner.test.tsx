/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Lesson } from '@/content/schema'

// The runner's children play audio on mount; stub it so tests stay deterministic.
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

const { ExerciseRunner } = await import('@/components/exercises/ExerciseRunner')

const lesson: Lesson = {
  id: 'test-lesson',
  title: 'Test',
  exercises: [
    {
      id: 'e1', type: 'listen-choose', target: 'नहीं', romanized: 'Nahin', english: 'No',
      options: ['No', 'Yes', 'Maybe', 'Later'], answer: 0,
    },
    {
      id: 'e2', type: 'listen-choose', target: 'चलो', romanized: 'Chalo', english: "Let's go",
      options: ["Let's go", 'Stop', 'Wait', 'Come'], answer: 0,
    },
  ],
}

const renderRunner = () =>
  render(<ExerciseRunner lesson={lesson} lang="hi" nextLessonId={null} />)

beforeEach(() => storage.clear())
// Vitest runs without `globals`, so Testing Library's automatic cleanup never
// registers and rendered trees would pile up across tests.
afterEach(cleanup)

describe('ExerciseRunner', () => {
  it('starts on the first exercise with a 1/2 counter', async () => {
    renderRunner()
    expect(await screen.findByText('1/2')).toBeTruthy()
  })

  it('advances after answering', async () => {
    const user = userEvent.setup()
    renderRunner()
    await user.click(await screen.findByRole('button', { name: 'No' }))
    await user.click(screen.getByRole('button', { name: /Continue/ }))
    expect(await screen.findByText('2/2')).toBeTruthy()
  })

  it('sends missed exercises to a review round', async () => {
    const user = userEvent.setup()
    renderRunner()
    // Answer both wrong.
    await user.click(await screen.findByRole('button', { name: 'Yes' }))
    await user.click(screen.getByRole('button', { name: /Continue/ }))
    await user.click(await screen.findByRole('button', { name: 'Stop' }))
    await user.click(screen.getByRole('button', { name: /Continue/ }))

    expect(await screen.findByText('review')).toBeTruthy()
    expect(screen.getByText(/One more look at the ones that slipped/)).toBeTruthy()
  })

  /**
   * Regression: review answers used to be discarded regardless of correctness,
   * so a learner could get every review answer wrong and still finish.
   */
  it('re-queues an exercise still answered wrong in review', async () => {
    const user = userEvent.setup()
    renderRunner()
    await user.click(await screen.findByRole('button', { name: 'Yes' }))
    await user.click(screen.getByRole('button', { name: /Continue/ }))
    await user.click(await screen.findByRole('button', { name: 'Stop' }))
    await user.click(screen.getByRole('button', { name: /Continue/ }))

    // First review round: get one wrong again.
    await screen.findByText('review')
    await user.click(await screen.findByRole('button', { name: 'Yes' }))
    await user.click(screen.getByRole('button', { name: /Continue/ }))
    await user.click(await screen.findByRole('button', { name: 'Stop' }))
    await user.click(screen.getByRole('button', { name: /Continue/ }))

    // It comes back rather than being silently cleared.
    expect(await screen.findByText('review')).toBeTruthy()
  })

  it('scores accuracy on the first pass only', async () => {
    const user = userEvent.setup()
    renderRunner()
    await user.click(await screen.findByRole('button', { name: 'No' }))       // correct
    await user.click(screen.getByRole('button', { name: /Continue/ }))
    await user.click(await screen.findByRole('button', { name: "Let's go" })) // correct
    await user.click(screen.getByRole('button', { name: /Continue/ }))

    expect(await screen.findByText('Lesson complete')).toBeTruthy()
    expect(screen.getByText('2/2')).toBeTruthy()
  })
})
