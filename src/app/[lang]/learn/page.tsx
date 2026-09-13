import { notFound } from 'next/navigation'
import { isLangCode } from '@/lib/languages'
import { getCourse } from '@/content'
import { isScene } from '@/content/schema'
import { Header } from '@/components/ui/Header'
import { LessonPath } from './LessonPath'

export default async function Learn({ params }: PageProps<'/[lang]/learn'>) {
  const { lang } = await params
  if (!isLangCode(lang)) notFound()

  const course = getCourse(lang)
  const units = course.units.map((unit) => ({
    id: unit.id,
    title: unit.title,
    emoji: unit.emoji,
    lessons: unit.lessons.map((l) => ({ id: l.id, title: l.title, count: l.exercises.length, scene: isScene(l) })),
  }))

  return (
    <>
      <Header lang={lang} back={{ href: `/${lang}`, label: 'Home' }} />
      <LessonPath lang={lang} units={units} />
    </>
  )
}
