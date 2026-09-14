'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { isScene, type Exercise, type Lesson } from '@/content/schema'
import { LANGUAGE_CONFIG, type LangCode } from '@/lib/languages'
import { completeLesson, recordPhrases, xpFor, XP_PER_CORRECT } from '@/lib/progress'
import { outcomeFor, phrasesOf } from '@/lib/phrase-memory'
import { prefetchClip } from '@/lib/clips'
import { useIsClient } from '@/lib/useIsClient'
import { Script } from '@/components/ui/Script'
import { CountUp } from '@/components/ui/CountUp'
import { Burst } from '@/components/ui/Burst'
import { Mor } from '@/components/ui/Mor'
import { ListenChoose } from './ListenChoose'
import { SelectPhrase } from './SelectPhrase'
import { SpeakRepeat } from './SpeakRepeat'
import { WordOrder } from './WordOrder'
import { ListenTypeRoman } from './ListenTypeRoman'
import { MatchPairs } from './MatchPairs'
import { SceneLead, SceneTranscript } from './Scene'

const MAX_REVIEW_PASSES = 2

function ExerciseView({ exercise, lang, onDone }: { exercise: Exercise; lang: LangCode; onDone: (correct: boolean) => void }) {
  switch (exercise.type) {
    case 'listen-choose':     return <ListenChoose exercise={exercise} lang={lang} onDone={onDone} />
    case 'select-phrase':     return <SelectPhrase exercise={exercise} lang={lang} onDone={onDone} />
    case 'speak-repeat':      return <SpeakRepeat exercise={exercise} lang={lang} onDone={onDone} />
    case 'word-order':        return <WordOrder exercise={exercise} lang={lang} onDone={onDone} />
    case 'listen-type-roman': return <ListenTypeRoman exercise={exercise} lang={lang} onDone={onDone} />
    case 'match-pairs':       return <MatchPairs exercise={exercise} lang={lang} onDone={onDone} />
  }
}

export function ExerciseRunner({
  lesson, lang, nextLessonId, variant = 'lesson', onComplete,
}: {
  lesson: Lesson
  lang: LangCode
  nextLessonId: string | null
  /** 'review' is the spaced-repetition session: its own ending, no replay. */
  variant?: 'lesson' | 'review'
  /** Called once, with first-pass results. Defaults to saving the lesson. */
  onComplete?: (correct: number, total: number) => void
}) {
  const cfg = LANGUAGE_CONFIG[lang]
  const isReview = variant === 'review'
  const scene = isScene(lesson) ? lesson.scene : null
  const total = lesson.exercises.length
  const mounted = useIsClient()

  const [queue, setQueue] = useState<Exercise[]>(lesson.exercises)
  const [index, setIndex] = useState(0)
  const [missed, setMissed] = useState<Exercise[]>([])
  // First-pass result per exercise id: revisiting can never inflate accuracy.
  const [results, setResults] = useState<Record<string, boolean>>({})
  const [reviewing, setReviewing] = useState(false)
  const [reviewPass, setReviewPass] = useState(0)
  const [finished, setFinished] = useState(false)
  const exerciseRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!mounted) return
    exerciseRef.current?.focus()
    window.scrollTo({ top: 0, behavior: 'smooth' })
    const upcoming = queue[index + 1]
    if (upcoming && upcoming.type !== 'match-pairs') {
      prefetchClip(lang, upcoming.target)
      if (upcoming.lead) prefetchClip(lang, upcoming.lead.text)
    }
  }, [index, reviewing, mounted, queue, lang])

  const firstPassCorrect = Object.values(results).filter(Boolean).length

  function handleDone(correct: boolean) {
    const current = queue[index]
    // First pass only. A revisit or the once-more round must neither inflate
    // accuracy nor tell phrase memory something it has already been told.
    const firstPass = !reviewing && !(current.id in results)
    const recorded = firstPass ? { ...results, [current.id]: correct } : results
    if (firstPass) {
      setResults(recorded)
      recordPhrases(lang, phrasesOf(current), outcomeFor(current, correct))
    }
    if (!correct) setMissed((m) => (m.some((x) => x.id === current.id) ? m : [...m, current]))

    const next = index + 1
    if (next < queue.length) { setIndex(next); return }

    const stillMissed = correct
      ? missed.filter((x) => x.id !== current.id)
      : (missed.some((x) => x.id === current.id) ? missed : [...missed, current])

    if (stillMissed.length > 0 && reviewPass < MAX_REVIEW_PASSES) {
      setQueue(stillMissed); setMissed([]); setIndex(0); setReviewing(true); setReviewPass((n) => n + 1)
      return
    }
    const firstTry = Object.values(recorded).filter(Boolean).length
    if (onComplete) onComplete(firstTry, total)
    else completeLesson(lang, lesson.id, firstTry, total)
    setFinished(true)
  }

  const handleSkip = () => handleDone(false)
  const handlePrev = () => setIndex((i) => Math.max(0, i - 1))

  function practiceAgain() {
    setQueue(lesson.exercises); setIndex(0); setMissed([]); setResults({})
    setReviewing(false); setReviewPass(0); setFinished(false)
  }

  if (finished) {
    const correct = firstPassCorrect
    const xp = isReview ? correct * XP_PER_CORRECT : xpFor(correct, total)
    const perfect = correct === total
    return (
      <div className="relative mx-auto max-w-md px-5 pb-16 pt-20 text-center">
        <Burst />
        <div className="stagger">
          <Mor pose="cheer" className="mx-auto -mb-2 w-44 sm:w-52" title="Mor cheering" />
          <Script lang={lang} className="display block text-6xl font-extrabold text-accent">{cfg.wellDone}</Script>
          <h1 className="display mt-3 text-2xl font-bold text-ink">
            {isReview ? 'Review done' : scene ? 'Scene complete' : 'Lesson complete'}
          </h1>

          <div className="mt-8 flex justify-center gap-3">
            <div className="rounded-2xl bg-surface px-6 py-4 shadow-[var(--shadow)]">
              <p className="display text-3xl font-extrabold text-ink">+<CountUp to={xp} /></p>
              <p className="text-xs text-ink-faint">XP</p>
            </div>
            <div className="rounded-2xl bg-surface px-6 py-4 shadow-[var(--shadow)]">
              <p className="display text-3xl font-extrabold text-ink">{correct}/{total}</p>
              <p className="text-xs text-ink-faint">first try</p>
            </div>
          </div>
          {perfect && <p className="mt-4 text-sm font-semibold text-ink-soft">Clean run.</p>}

          {isReview ? (
            <div className="mt-10 flex flex-col gap-3">
              <Link href={`/${lang}`} className="press display rounded-2xl bg-accent px-6 py-4 text-lg font-bold text-accent-ink shadow-[var(--shadow-lift)]">
                Home
              </Link>
              <Link href={`/${lang}/learn`} className="mt-1 text-sm text-ink-faint underline-offset-4 hover:underline">
                All lessons
              </Link>
            </div>
          ) : (
          <div className="mt-10 flex flex-col gap-3">
            {nextLessonId && (
              <Link href={`/${lang}/lesson/${nextLessonId}`} className="press display rounded-2xl bg-accent px-6 py-4 text-lg font-bold text-accent-ink shadow-[var(--shadow-lift)]">
                Next lesson
              </Link>
            )}
            <button type="button" onClick={practiceAgain} className="press rounded-2xl bg-surface px-6 py-3 font-semibold text-ink shadow-[var(--shadow)]">
              Practice again
            </button>
            <Link href={`/${lang}/learn`} className="mt-1 text-sm text-ink-faint underline-offset-4 hover:underline">
              All lessons
            </Link>
          </div>
          )}
        </div>
      </div>
    )
  }

  const progress = reviewing ? 1 : index / total
  const turn = queue[index]
  const lead = scene && turn.type !== 'match-pairs' ? turn.lead : undefined
  // The once-more round replays misses out of order, so the transcript would
  // read as nonsense; each retried turn keeps its own lead for context.
  const setting = scene && !reviewing && index === 0 ? scene.setting : null
  const transcript = scene && !reviewing ? queue.slice(0, index) : []

  return (
    <div className="mx-auto w-full max-w-2xl px-5 pb-48">
      <div className="sticky z-10 -mx-5 bg-ground/90 px-5 pb-2 pt-3 backdrop-blur" style={{ top: 'var(--header-h, 57px)' }}>
        <div className="flex items-center gap-3">
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface-sunk" role="progressbar"
            aria-valuenow={reviewing ? total : index} aria-valuemin={0} aria-valuemax={total} aria-label={isReview ? 'Review progress' : 'Lesson progress'}>
            <div className="h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${Math.max(4, progress * 100)}%` }} />
          </div>
          <span className="display text-xs font-bold tabular-nums text-ink-faint">{reviewing ? 'review' : `${index + 1}/${total}`}</span>
        </div>
        <div className="mt-1.5 flex items-center justify-between text-xs">
          <button type="button" onClick={handlePrev} disabled={index === 0} className="-my-3 rounded-lg px-3 py-3.5 font-semibold text-ink-faint hover:text-ink disabled:invisible">
            ← prev
          </button>
          {reviewing && <span className="text-ink-faint">Once more</span>}
          <button type="button" onClick={handleSkip} className="-my-3 rounded-lg px-3 py-3.5 font-semibold text-ink-faint hover:text-ink">
            skip →
          </button>
        </div>
      </div>

      <p className="sr-only" role="status" aria-live="polite">{reviewing ? 'Review' : `${index + 1} of ${total}`}</p>

      <div ref={exerciseRef} tabIndex={-1} className="mt-8 outline-none">
        {mounted ? (
          <>
            {scene && (setting || transcript.length > 0 || lead) && (
              <div className="mb-8 flex flex-col gap-4">
                {setting && <p className="text-center text-sm font-semibold text-ink-soft">{setting}</p>}
                <SceneTranscript turns={transcript} lang={lang} />
                {lead && <SceneLead key={`${reviewPass}:${turn.id}`} lead={lead} lang={lang} other={scene.other} />}
              </div>
            )}
            {/* Keyed by pass too: when the last exercise is also the first one
                re-queued, an id-only key would keep its answered state. */}
            <ExerciseView key={`${reviewPass}:${turn.id}`} exercise={turn} lang={lang} onDone={handleDone} />
          </>
        ) : (
          <div className="animate-pulse" aria-hidden="true">
            <div className="mx-auto h-16 w-2/3 rounded-2xl bg-surface" />
            <div className="mt-8 grid gap-3 sm:grid-cols-2">{[0, 1, 2, 3].map((i) => <div key={i} className="h-16 rounded-2xl bg-surface" />)}</div>
          </div>
        )}
      </div>
    </div>
  )
}
