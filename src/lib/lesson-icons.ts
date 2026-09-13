import { AVAILABLE_LANGUAGES, getCourse } from '@/content'

/**
 * A glyph per lesson, so the path reads at a glance.
 *
 * Keyed by title because the titles are shared across courses by design. The
 * reference implementation's map covered Hindi only, so fifteen of its
 * non-Hindi lesson cards fell back to a generic book icon -- a test asserts
 * every lesson in every course resolves to a real icon.
 */
const ICONS: Record<string, string> = {
  'Saying Yes & No': '🤝',
  'Quick Replies': '⚡',
  'Expressing Needs': '🙋',
  'At the Chai Stall': '☕',
  'At the Tea Stall': '☕',
  'At the Market': '🛒',
  'Getting an Auto': '🛺',
  'Getting Around': '🛺',
  'Making Plans': '📅',
  'Small Talk': '💬',
  'Bowing Out Politely': '🙏',
}

export const FALLBACK_ICON = '📖'

export function lessonIcon(title: string): string {
  return ICONS[title] ?? FALLBACK_ICON
}

/** Every lesson title that exists across all shipped courses. */
export function allLessonTitles(): string[] {
  const titles = new Set<string>()
  for (const lang of AVAILABLE_LANGUAGES) {
    for (const unit of getCourse(lang).units) {
      for (const lesson of unit.lessons) titles.add(lesson.title)
    }
  }
  return [...titles]
}
