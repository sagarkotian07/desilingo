import { notFound } from 'next/navigation'
import { isLangCode } from '@/lib/languages'
import { getLesson, allLessons } from '@/content'
import { AVAILABLE_LANGUAGES } from '@/content'
import { ExerciseRunner } from '@/components/exercises/ExerciseRunner'
import { LessonHeader } from '@/components/ui/LessonHeader'

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
      <LessonHeader lang={lang} title={found.lesson.title} />
      <ExerciseRunner lesson={found.lesson} lang={lang} nextLessonId={nextLessonId} />
    </>
  )
}
