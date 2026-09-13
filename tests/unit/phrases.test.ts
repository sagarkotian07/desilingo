import { describe, it, expect } from 'vitest'
import { Course } from '@/content/schema'
import { collectPhrases } from '@/lib/phrases'
import { PACE_NORMAL, PACE_SLOW } from '@/lib/audio'

const lead = { text: 'चाय लोगे?', romanized: 'Chai loge?', english: 'Tea?' }
const hear = {
  id: 'e3', type: 'listen-choose', target: 'बीस रुपये', romanized: 'Bees rupaye', english: 'Twenty rupees',
  options: ['Twenty rupees', 'Two rupees', 'Free'], answer: 0,
}
const course = Course.parse({
  lang: 'hi', tagline: 't',
  units: [{
    id: 'unit-1', title: 'U', emoji: '☕',
    lessons: [{
      id: 'scene-1', title: 'A cup of chai', scene: { setting: 'A chai stall.', other: 'Chai-wala' },
      exercises: [
        { id: 'e1', type: 'speak-repeat', target: 'हाँ, एक चाय', romanized: 'Haan, ek chai', english: 'Yes, one tea', lead },
        { id: 'e2', type: 'speak-repeat', target: 'कम चीनी', romanized: 'Kam cheeni', english: 'Less sugar', lead: { ...lead, text: 'चीनी?' } },
        hear,
      ],
    }],
  }],
})

describe('collectPhrases for scenes', () => {
  const jobs = collectPhrases(course)
  const paces = (text: string) => jobs.filter((j) => j.text === text).map((j) => j.pace)

  it("voices the other speaker's lines at normal pace only", () => {
    expect(paces('चाय लोगे?')).toEqual([PACE_NORMAL])
    expect(paces('चीनी?')).toEqual([PACE_NORMAL])
  })

  it('still gives a spoken turn its slow replay', () => {
    expect(paces('कम चीनी').sort()).toEqual([PACE_NORMAL, PACE_SLOW].sort())
  })
})
