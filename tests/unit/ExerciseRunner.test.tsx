/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, within } from '@testing-library/react'
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
// jsdom doesn't implement scrolling and logs a line per call.
window.scrollTo = vi.fn() as typeof window.scrollTo

const { ExerciseRunner } = await import('@/components/exercises/ExerciseRunner')
const { resetProgress } = await import('@/lib/progress')

/** What the store saved for Hindi. */
const saved = () => JSON.parse(storage.getItem('desilingo:progress:hi') ?? '{}')

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

// The store caches a snapshot per language; clearing storage alone would leak
// phrase records from one test into the next.
beforeEach(() => { storage.clear(); resetProgress('hi') })
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
    expect(screen.getByText('Once more')).toBeTruthy()
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

  it('skips forward and counts the skipped exercise as not known', async () => {
    const user = userEvent.setup()
    renderRunner()
    await screen.findByText('1/2')
    await user.click(screen.getByRole('button', { name: /skip/ }))
    expect(await screen.findByText('2/2')).toBeTruthy()
  })

  it('goes back to the previous exercise', async () => {
    const user = userEvent.setup()
    renderRunner()
    await user.click(await screen.findByRole('button', { name: 'No' }))
    await user.click(screen.getByRole('button', { name: /Continue/ }))
    await screen.findByText('2/2')
    await user.click(screen.getByRole('button', { name: /prev/ }))
    expect(await screen.findByText('1/2')).toBeTruthy()
  })

  it('hides prev on the first exercise', async () => {
    renderRunner()
    await screen.findByText('1/2')
    expect(screen.getByRole('button', { name: /prev/ })).toHaveProperty('disabled', true)
  })

  /**
   * Going back re-renders the exercise, so without keying results by id a
   * learner could answer wrong, go back, answer right, and inflate accuracy.
   */
  /** Regression: the review round reused the answered component when the
   *  lesson's last exercise was also the first one re-queued. */
  it('lets the last exercise be answered again in review', async () => {
    const user = userEvent.setup()
    renderRunner()
    await user.click(await screen.findByRole('button', { name: 'No' }))
    await user.click(screen.getByRole('button', { name: /Continue/ }))
    await user.click(await screen.findByRole('button', { name: 'Stop' }))
    await user.click(screen.getByRole('button', { name: /Continue/ }))

    await screen.findByText('review')
    await user.click(await screen.findByRole('button', { name: "Let's go" }))
    await user.click(screen.getByRole('button', { name: /Continue/ }))
    expect(await screen.findByText('Lesson complete')).toBeTruthy()
  })

  it('keeps the first answer when an exercise is revisited', async () => {
    const user = userEvent.setup()
    renderRunner()
    // Wrong first.
    await user.click(await screen.findByRole('button', { name: 'Yes' }))
    await user.click(screen.getByRole('button', { name: /Continue/ }))
    await screen.findByText('2/2')
    // Back, then right.
    await user.click(screen.getByRole('button', { name: /prev/ }))
    await user.click(await screen.findByRole('button', { name: 'No' }))
    await user.click(screen.getByRole('button', { name: /Continue/ }))
    // Finish the second one correctly.
    await user.click(await screen.findByRole('button', { name: "Let's go" }))
    await user.click(screen.getByRole('button', { name: /Continue/ }))

    // Review round for the one first answered wrong.
    await screen.findByText('review')
    await user.click(await screen.findByRole('button', { name: 'No' }))
    await user.click(screen.getByRole('button', { name: /Continue/ }))

    expect(await screen.findByText('Lesson complete')).toBeTruthy()
    // 1 of 2 on first pass, not 2 of 2.
    expect(screen.getByText('1/2')).toBeTruthy()
  })

  describe('phrase memory', () => {
    it('remembers a right answer', async () => {
      const user = userEvent.setup()
      renderRunner()
      await user.click(await screen.findByRole('button', { name: 'No' }))
      await user.click(screen.getByRole('button', { name: /Continue/ }))
      await screen.findByText('2/2')
      expect(saved().phrases['नहीं']).toMatchObject({ box: 1, seen: 1, misses: 0 })
    })

    it('remembers a skip as a miss', async () => {
      const user = userEvent.setup()
      renderRunner()
      await screen.findByText('1/2')
      await user.click(screen.getByRole('button', { name: /skip/ }))
      await screen.findByText('2/2')
      expect(saved().phrases['नहीं']).toMatchObject({ box: 0, misses: 1 })
    })

    it('ignores the once-more round', async () => {
      const user = userEvent.setup()
      renderRunner()
      await user.click(await screen.findByRole('button', { name: 'Yes' }))
      await user.click(screen.getByRole('button', { name: /Continue/ }))
      await user.click(await screen.findByRole('button', { name: 'Stop' }))
      await user.click(screen.getByRole('button', { name: /Continue/ }))
      await screen.findByText('review')
      await user.click(await screen.findByRole('button', { name: 'No' }))
      await user.click(screen.getByRole('button', { name: /Continue/ }))
      await user.click(await screen.findByRole('button', { name: "Let's go" }))
      await user.click(screen.getByRole('button', { name: /Continue/ }))

      await screen.findByText('Lesson complete')
      expect(saved().phrases['नहीं']).toMatchObject({ box: 0, seen: 1, misses: 1 })
    })

    it('ignores a revisit', async () => {
      const user = userEvent.setup()
      renderRunner()
      await user.click(await screen.findByRole('button', { name: 'Yes' }))
      await user.click(screen.getByRole('button', { name: /Continue/ }))
      await screen.findByText('2/2')
      await user.click(screen.getByRole('button', { name: /prev/ }))
      await user.click(await screen.findByRole('button', { name: 'No' }))
      await user.click(screen.getByRole('button', { name: /Continue/ }))
      await screen.findByText('2/2')
      expect(saved().phrases['नहीं']).toMatchObject({ box: 0, seen: 1, misses: 1 })
    })
  })

  describe('review variant', () => {
    const renderReview = (onComplete = vi.fn()) => {
      render(<ExerciseRunner lesson={lesson} lang="hi" nextLessonId={null} variant="review" onComplete={onComplete} />)
      return onComplete
    }

    it('reports first-try results instead of saving a lesson', async () => {
      const user = userEvent.setup()
      const onComplete = renderReview()
      await user.click(await screen.findByRole('button', { name: 'No' }))
      await user.click(screen.getByRole('button', { name: /Continue/ }))
      await user.click(await screen.findByRole('button', { name: 'Stop' }))
      await user.click(screen.getByRole('button', { name: /Continue/ }))
      await screen.findByText('review')
      await user.click(await screen.findByRole('button', { name: "Let's go" }))
      await user.click(screen.getByRole('button', { name: /Continue/ }))

      await screen.findByText('Review done')
      expect(onComplete).toHaveBeenCalledTimes(1)
      expect(onComplete).toHaveBeenCalledWith(1, 2)
      expect(saved().lessons).toEqual({})
    })

    it('ends with a way home and no replay', async () => {
      const user = userEvent.setup()
      renderReview()
      await user.click(await screen.findByRole('button', { name: 'No' }))
      await user.click(screen.getByRole('button', { name: /Continue/ }))
      await user.click(await screen.findByRole('button', { name: "Let's go" }))
      await user.click(screen.getByRole('button', { name: /Continue/ }))

      await screen.findByText('Review done')
      expect(screen.getByRole('link', { name: 'Home' }).getAttribute('href')).toBe('/hi')
      expect(screen.queryByRole('button', { name: 'Practice again' })).toBeNull()
      // Two right, no clean-run bonus.
      // CountUp takes ~700ms; allow for a loaded CI box.
      expect(await screen.findByText('+4', {}, { timeout: 3000 })).toBeTruthy()
    })
  })

  describe('scenes', () => {
    const scene: Lesson = {
      id: 'test-scene', title: 'A cup of chai',
      scene: { setting: 'A roadside chai stall.', other: 'Chai-wala' },
      exercises: [
        {
          id: 'e1', type: 'select-phrase', target: 'हाँ, ठीक है', romanized: 'Haan, theek hai', english: "Yes, that's fine",
          lead: { text: 'चाय लोगे?', romanized: 'Chai loge?', english: 'Tea?' },
          options: [{ text: 'हाँ, ठीक है' }, { text: 'नहीं चाहिए' }, { text: 'अभी नहीं' }], answer: 0,
        },
        {
          id: 'e2', type: 'listen-choose', target: 'एक मिनट', romanized: 'Ek minute', english: 'One minute',
          options: ['One minute', 'Not now', 'Got it'], answer: 0,
        },
        {
          id: 'e3', type: 'select-phrase', target: 'कोई बात नहीं', romanized: 'Koi baat nahin', english: "It's okay, no problem",
          options: [{ text: 'कोई बात नहीं' }, { text: 'शुक्रिया' }, { text: 'समझ गया' }], answer: 0,
        },
      ],
    }
    const renderScene = () => render(<ExerciseRunner lesson={scene} lang="hi" nextLessonId={null} />)

    it('sets the scene and gives their line before turn 1', async () => {
      renderScene()
      expect(await screen.findByText('A roadside chai stall.')).toBeTruthy()
      expect(screen.getByText('Chai-wala')).toBeTruthy()
      expect(screen.getByText('Tea?')).toBeTruthy()
    })

    it('moves a finished turn into the conversation so far', async () => {
      const user = userEvent.setup()
      renderScene()
      await user.click(await screen.findByRole('button', { name: 'हाँ, ठीक है' }))
      await user.click(screen.getByRole('button', { name: /Continue/ }))

      await screen.findByText('2/3')
      expect(screen.queryByText('A roadside chai stall.')).toBeNull()
      const soFar = screen.getByRole('list', { name: 'So far' })
      expect(within(soFar).getByText('Tea?')).toBeTruthy()
      expect(within(soFar).getByText("Yes, that's fine")).toBeTruthy()
    })

    it('keeps going after a wrong turn; misses wait for the end', async () => {
      const user = userEvent.setup()
      renderScene()
      await user.click(await screen.findByRole('button', { name: 'नहीं चाहिए' }))
      await user.click(screen.getByRole('button', { name: /Continue/ }))
      expect(await screen.findByText('2/3')).toBeTruthy()
    })

    it("remembers your line, not theirs", async () => {
      const user = userEvent.setup()
      renderScene()
      await user.click(await screen.findByRole('button', { name: 'हाँ, ठीक है' }))
      await user.click(screen.getByRole('button', { name: /Continue/ }))
      await screen.findByText('2/3')
      expect(saved().phrases['हाँ, ठीक है']).toBeDefined()
      expect(saved().phrases['चाय लोगे?']).toBeUndefined()
    })

    it('ends as a scene', async () => {
      const user = userEvent.setup()
      renderScene()
      await user.click(await screen.findByRole('button', { name: 'हाँ, ठीक है' }))
      await user.click(screen.getByRole('button', { name: /Continue/ }))
      await user.click(await screen.findByRole('button', { name: 'One minute' }))
      await user.click(screen.getByRole('button', { name: /Continue/ }))
      await user.click(await screen.findByRole('button', { name: 'कोई बात नहीं' }))
      await user.click(screen.getByRole('button', { name: /Continue/ }))
      expect(await screen.findByText('Scene complete')).toBeTruthy()
    })
  })
})
