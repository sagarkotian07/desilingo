'use client'

import Link from 'next/link'
import { useState } from 'react'
import type { LangCode } from '@/lib/languages'
import { buildReviewLesson, type ReviewPool } from '@/lib/phrase-memory'
import { localToday, recordReview, useProgress } from '@/lib/progress'
import { useIsClient } from '@/lib/useIsClient'
import { ExerciseRunner } from '@/components/exercises/ExerciseRunner'

/** What's due lives in localStorage, so the review can only be picked in the browser. */
export function ReviewSession({ lang, pool }: { lang: LangCode; pool: ReviewPool }) {
  const mounted = useIsClient()
  if (!mounted) {
    return (
      <div className="mx-auto max-w-2xl animate-pulse px-5 pt-16" aria-hidden="true">
        <div className="mx-auto h-16 w-2/3 rounded-2xl bg-surface" />
      </div>
    )
  }
  return <Session lang={lang} pool={pool} />
}

function Session({ lang, pool }: { lang: LangCode; pool: ReviewPool }) {
  const { phrases } = useProgress(lang)
  // Frozen for the session. Every answer saves, and rebuilding on each save
  // would swap the exercises out from under the learner.
  const [lesson] = useState(() => buildReviewLesson(pool, phrases, localToday()))

  if (!lesson) {
    return (
      <div className="stagger mx-auto max-w-md px-5 pt-24 text-center">
        <p className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-accent text-4xl text-accent-ink shadow-[var(--shadow-lift)]" aria-hidden="true">✓</p>
        <h1 className="display mt-6 text-2xl font-bold text-ink">All caught up</h1>
        <Link href={`/${lang}`} className="press display mt-10 block rounded-2xl bg-surface px-6 py-4 font-bold text-ink shadow-[var(--shadow)]">
          Home
        </Link>
      </div>
    )
  }

  return (
    <ExerciseRunner
      lesson={lesson}
      lang={lang}
      nextLessonId={null}
      variant="review"
      onComplete={(correct) => recordReview(lang, correct)}
    />
  )
}
