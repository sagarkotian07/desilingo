import Link from 'next/link'
import { notFound } from 'next/navigation'
import { isLangCode } from '@/lib/languages'
import { getLesson, allLessons } from '@/content'
import { AVAILABLE_LANGUAGES } from '@/content'
import { ExerciseRunner } from '@/components/exercises/ExerciseRunner'

/** Prerender every lesson: the content is static, so there is no reason to
 *  render these on demand. */
export function generateStaticParams() {
  return AVAILABLE_LANGUAGES.flatMap((lang) =>
    allLessons(lang).map(({ lesson }) => ({ lang, lessonId: lesson.id })),
  )
}

export default async function LessonPage({ params }: PageProps<'/[lang]/lesson/[lessonId]'>) {
  const { lang, lessonId } = await params
  if (!isLangCode(lang)) notFound()

  const found = getLesson(lang, lessonId)
  if (!found) notFound()

  const order = allLessons(lang)
  const at = order.findIndex(({ lesson }) => lesson.id === lessonId)
  const nextLessonId = at >= 0 && at + 1 < order.length ? order[at + 1].lesson.id : null

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-line bg-ground/85 backdrop-blur">
        <div className="mx-auto flex w-full max-w-2xl items-center gap-3 px-4 py-3">
          <Link
            href={`/${lang}/learn`}
            className="rounded-lg px-2 py-1 text-sm text-ink-soft hover:bg-surface-sunk hover:text-ink"
            aria-label="Leave this lesson"
          >
            <span aria-hidden="true">←</span> Exit
          </Link>
          <p className="ml-auto text-sm font-semibold text-ink-soft">{found.lesson.title}</p>
        </div>
      </header>
      <ExerciseRunner lesson={found.lesson} lang={lang} nextLessonId={nextLessonId} />
    </>
  )
}
