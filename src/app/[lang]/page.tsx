import { notFound } from 'next/navigation'
import { isLangCode, LANGUAGE_CONFIG } from '@/lib/languages'
import { getCourse, allLessons } from '@/content'
import { Header } from '@/components/ui/Header'
import { HomeDashboard } from './HomeDashboard'

export default async function Home({ params }: PageProps<'/[lang]'>) {
  const { lang } = await params
  if (!isLangCode(lang)) notFound()

  const course = getCourse(lang)
  const cfg = LANGUAGE_CONFIG[lang]
  const lessons = allLessons(lang).map(({ unit, lesson }) => ({
    id: lesson.id, title: lesson.title, unitTitle: unit.title, count: lesson.exercises.length,
  }))

  return (
    <>
      <Header lang={lang} />
      <HomeDashboard
        lang={lang}
        tagline={course.tagline}
        greeting={cfg.greeting}
        glyph={cfg.glyph}
        englishName={cfg.englishName}
        lessons={lessons}
      />
    </>
  )
}
