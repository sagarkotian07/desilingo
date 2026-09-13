import { notFound } from 'next/navigation'
import { isLangCode } from '@/lib/languages'
import { getCourse } from '@/content'
import { buildReviewPool } from '@/lib/phrase-memory'
import { LessonHeader } from '@/components/ui/LessonHeader'
import { ReviewSession } from './ReviewSession'

export default async function ReviewPage({ params }: PageProps<'/[lang]/review'>) {
  const { lang } = await params
  if (!isLangCode(lang)) notFound()

  return (
    <>
      <LessonHeader lang={lang} title="Review" kind="review" />
      <ReviewSession lang={lang} pool={buildReviewPool(getCourse(lang))} />
    </>
  )
}
