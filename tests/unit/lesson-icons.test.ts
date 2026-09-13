import { describe, it, expect } from 'vitest'
import { allLessonTitles, lessonIcon, FALLBACK_ICON } from '@/lib/lesson-icons'

describe('lesson icons', () => {
  /**
   * The app this is modelled on mapped icons by title but only entered the
   * Hindi ones, so every non-Hindi lesson silently showed a generic book. A
   * lookup table that quietly degrades is exactly the kind of thing a test
   * should hold in place.
   */
  it('covers every lesson in every shipped course', () => {
    const uncovered = allLessonTitles().filter((t) => lessonIcon(t) === FALLBACK_ICON)
    expect(uncovered, `no icon for: ${uncovered.join(', ')}`).toEqual([])
  })

  it('falls back rather than throwing on an unknown title', () => {
    expect(lessonIcon('A Lesson That Does Not Exist')).toBe(FALLBACK_ICON)
  })
})
