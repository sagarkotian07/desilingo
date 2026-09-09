import { Course } from './schema'
import type { LangCode } from '@/lib/languages'
import hi from './hi.json'

/**
 * Course registry.
 *
 * Each language is a separate module so a Hindi learner never downloads the
 * Tamil course. Adding a language is one import plus one line here; everything
 * else (audio generation, validation, routing) derives from this map.
 */
const RAW: Partial<Record<LangCode, unknown>> = {
  hi,
}

const cache = new Map<LangCode, Course>()

/** Languages with authored content. The picker only offers these. */
export const AVAILABLE_LANGUAGES = Object.keys(RAW) as LangCode[]

export function hasCourse(lang: LangCode): boolean {
  return RAW[lang] !== undefined
}

/** Parses through the Zod schema, so malformed content fails loudly at the
 *  boundary rather than rendering a broken exercise. */
export function getCourse(lang: LangCode): Course {
  const cached = cache.get(lang)
  if (cached) return cached
  const raw = RAW[lang]
  if (!raw) throw new Error(`No course authored for language "${lang}"`)
  const parsed = Course.parse(raw)
  cache.set(lang, parsed)
  return parsed
}

export function getLesson(lang: LangCode, lessonId: string) {
  for (const unit of getCourse(lang).units) {
    const lesson = unit.lessons.find((l) => l.id === lessonId)
    if (lesson) return { unit, lesson }
  }
  return null
}

export function allLessons(lang: LangCode) {
  return getCourse(lang).units.flatMap((unit) =>
    unit.lessons.map((lesson) => ({ unit, lesson })),
  )
}
