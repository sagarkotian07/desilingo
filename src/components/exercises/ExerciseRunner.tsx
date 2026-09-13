'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import type { Exercise, Lesson } from '@/content/schema'
import { LANGUAGE_CONFIG, type LangCode } from '@/lib/languages'
import { completeLesson, xpFor } from '@/lib/progress'
import { useIsClient } from '@/lib/useIsClient'
import { Script } from '@/components/ui/Script'
import { ListenChoose } from './ListenChoose'
import { SelectPhrase } from './SelectPhrase'
import { SpeakRepeat } from './SpeakRepeat'
import { WordOrder } from './WordOrder'
import { ListenTypeRoman } from './ListenTypeRoman'
import { MatchPairs } from './MatchPairs'

/** How many times a missed exercise can come back before we move on. */
const MAX_REVIEW_PASSES = 2

function ExerciseView({
  exercise, lang, onDone,
}: { exercise: Exercise; lang: LangCode; onDone: (correct: boolean) => void }) {
  // The key resets component state between exercises; without it a lesson with
  // two exercises of the same type would carry the first one's answer over.
  const key = exercise.id
  switch (exercise.type) {
    case 'listen-choose':     return <ListenChoose key={key} exercise={exercise} lang={lang} onDone={onDone} />
    case 'select-phrase':     return <SelectPhrase key={key} exercise={exercise} lang={lang} onDone={onDone} />
    case 'speak-repeat':      return <SpeakRepeat key={key} exercise={exercise} lang={lang} onDone={onDone} />
    case 'word-order':        return <WordOrder key={key} exercise={exercise} lang={lang} onDone={onDone} />
    case 'listen-type-roman': return <ListenTypeRoman key={key} exercise={exercise} lang={lang} onDone={onDone} />
    case 'match-pairs':       return <MatchPairs key={key} exercise={exercise} lang={lang} onDone={onDone} />
  }
}

export function ExerciseRunner({
  lesson, lang, nextLessonId,
}: { lesson: Lesson; lang: LangCode; nextLessonId: string | null }) {
  const cfg = LANGUAGE_CONFIG[lang]
  const total = lesson.exercises.length

  // Options are shuffled with a per-session salt, which by definition differs
  // between the server render and the client. Rendering exercises only after
  // mount avoids the hydration mismatch that causes, and avoids the alternative
  // of showing the authored order (correct answer first) for a frame.
  const mounted = useIsClient()

  const [queue, setQueue] = useState<Exercise[]>(lesson.exercises)
  const [index, setIndex] = useState(0)
  const [missed, setMissed] = useState<Exercise[]>([])
  /**
   * First-pass result per exercise id.
   *
   * Keyed rather than counted so navigating back and re-answering cannot
   * inflate accuracy: the first answer for an exercise is the one that counts.
   */
  const [results, setResults] = useState<Record<string, boolean>>({})
  const [reviewing, setReviewing] = useState(false)
  const [reviewPass, setReviewPass] = useState(0)
  const [finished, setFinished] = useState(false)
  const exerciseRef = useRef<HTMLDivElement>(null)

  // Focus follows the exercise, not the button that disappeared. Scrolling
  // resets too: a long exercise otherwise leaves the next one starting
  // mid-page.
  useEffect(() => {
    if (!mounted) return
    exerciseRef.current?.focus()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [index, reviewing, mounted])

  /** Replay the lesson without leaving the screen. */
  function practiceAgain() {
    setQueue(lesson.exercises)
    setIndex(0)
    setMissed([])
    setResults({})
    setReviewing(false)
    setReviewPass(0)
    setFinished(false)
  }

  const firstPassCorrect = Object.values(results).filter(Boolean).length

  function handleDone(correct: boolean) {
    const current = queue[index]

    // Accuracy is measured on the first pass only, so the review round cannot
    // inflate it -- but getting it right in review still clears the exercise.
    const recorded = reviewing || current.id in results
      ? results
      : { ...results, [current.id]: correct }
    if (recorded !== results) setResults(recorded)

    // Track misses in the review round too. Anything answered in review used to
    // be cleared regardless of whether it was right, so a learner could get
    // every review answer wrong and still finish the lesson.
    if (!correct) {
      setMissed((m) => (m.some((x) => x.id === current.id) ? m : [...m, current]))
    }

    const next = index + 1
    if (next < queue.length) { setIndex(next); return }

    const stillMissed = correct
      ? missed.filter((x) => x.id !== current.id)
      : (missed.some((x) => x.id === current.id) ? missed : [...missed, current])

    // Cap the number of review rounds: repeating a phrase the learner keeps
    // missing is discouraging, and an uncapped loop is inescapable.
    if (stillMissed.length > 0 && reviewPass < MAX_REVIEW_PASSES) {
      setQueue(stillMissed)
      setMissed([])
      setIndex(0)
      setReviewing(true)
      setReviewPass((n) => n + 1)
      return
    }

    completeLesson(lang, lesson.id, Object.values(recorded).filter(Boolean).length, total)
    setFinished(true)
  }

  /** Skipping counts as not knowing it -- it must never earn XP. */
  const handleSkip = () => handleDone(false)
  const handlePrev = () => setIndex((i) => Math.max(0, i - 1))

  if (finished) {
    const correct = firstPassCorrect
    const xp = xpFor(correct, total)
    const perfect = correct === total
    return (
      <div className="animate-pop mx-auto max-w-md px-4 py-16 text-center">
        <p className="text-6xl" aria-hidden="true">{perfect ? '🎉' : '🌟'}</p>
        <h1 className="mt-4 text-3xl font-extrabold text-ink">Lesson complete</h1>
        <Script lang={lang} className="mt-1 block text-2xl font-bold text-marigold">{cfg.wellDone}</Script>

        <div className="mt-6 flex justify-center gap-3">
          <div className="rounded-2xl bg-marigold-soft px-5 py-3">
            <p className="text-2xl font-extrabold text-ink">+{xp}</p>
            <p className="text-xs text-ink-soft">XP earned</p>
          </div>
          <div className="rounded-2xl bg-indigo-soft px-5 py-3">
            <p className="text-2xl font-extrabold text-ink">{correct}/{total}</p>
            <p className="text-xs text-ink-soft">first try</p>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3">
          <button
            type="button"
            onClick={practiceAgain}
            className="rounded-2xl border-2 border-line px-6 py-3 font-semibold text-ink transition-transform active:scale-[0.99]"
          >
            Practice again <span aria-hidden="true">🔄</span>
          </button>
          {nextLessonId && (
            <Link
              href={`/${lang}/lesson/${nextLessonId}`}
              className="rounded-2xl bg-indigo px-6 py-4 font-bold text-white shadow-[var(--shadow)] dark:text-indigo-soft"
            >
              Next lesson <span aria-hidden="true">→</span>
            </Link>
          )}
          <Link href={`/${lang}/learn`} className="rounded-2xl border-2 border-line px-6 py-3 font-semibold text-ink">
            All lessons
          </Link>
        </div>
      </div>
    )
  }

  const progress = reviewing ? 1 : index / total

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-16">
      <div className="sticky top-[57px] z-10 -mx-4 bg-ground/90 px-4 pb-3 pt-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <div
            className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface-sunk"
            role="progressbar"
            aria-valuenow={reviewing ? total : index}
            aria-valuemin={0}
            aria-valuemax={total}
            aria-label="Lesson progress"
          >
            <div
              className="h-full rounded-full bg-marigold transition-[width] duration-500"
              style={{ width: `${Math.max(4, progress * 100)}%` }}
            />
          </div>
          <span className="text-xs font-semibold tabular-nums text-ink-faint">
            {reviewing ? 'review' : `${index + 1}/${total}`}
          </span>
        </div>
        {reviewing && (
          <p className="mt-2 text-center text-xs text-ink-soft">
            One more look at the ones that slipped
          </p>
        )}

        {/* Forward-only navigation makes a mis-tap unrecoverable. Going back
            re-renders the exercise, but the first answer is what counts, so
            revisiting can never inflate the score. */}
        <div className="mt-2 flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={handlePrev}
            disabled={index === 0}
            className="rounded px-1.5 py-0.5 font-semibold text-ink-faint hover:text-ink disabled:invisible"
          >
            <span aria-hidden="true">←</span> prev
          </button>
          <button
            type="button"
            onClick={handleSkip}
            className="rounded px-1.5 py-0.5 font-semibold text-ink-faint hover:text-ink"
          >
            skip <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>

      {/* Moving focus to the new exercise and announcing it: without this the
          focused Continue button simply vanished, focus fell back to <body>,
          and a screen-reader user got no signal that a new question had
          loaded. */}
      <p className="sr-only" role="status" aria-live="polite">
        {reviewing ? 'Review question' : `Question ${index + 1} of ${total}`}
      </p>

      <div
        ref={exerciseRef}
        tabIndex={-1}
        className="mt-6 outline-none"
      >
        {mounted ? (
          <ExerciseView exercise={queue[index]} lang={lang} onDone={handleDone} />
        ) : (
          <div className="animate-pulse" aria-hidden="true">
            <div className="h-40 rounded-3xl border border-line bg-surface" />
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {[0, 1, 2, 3].map((i) => <div key={i} className="h-16 rounded-2xl bg-surface" />)}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
