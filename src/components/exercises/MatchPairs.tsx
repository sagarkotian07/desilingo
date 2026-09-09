'use client'

import { useMemo, useState } from 'react'
import type { Exercise } from '@/content/schema'
import type { LangCode } from '@/lib/languages'
import { seededShuffle } from '@/lib/shuffle'
import { Script } from '@/components/ui/Script'
import { useAudio } from '@/lib/useAudio'
import { Prompt, Feedback, ContinueButton } from './shared'

type Ex = Extract<Exercise, { type: 'match-pairs' }>

/** Tap a phrase, then its meaning. Rewards recognition across a whole set at
 *  once, which single-question formats can't test. */
export function MatchPairs({
  exercise, lang, onDone,
}: { exercise: Ex; lang: LangCode; onDone: (correct: boolean) => void }) {
  const audio = useAudio(lang)
  const natives = useMemo(
    () => seededShuffle(exercise.pairs.map((p, i) => ({ ...p, i })), `${exercise.id}-n`),
    [exercise],
  )
  const englishes = useMemo(
    () => seededShuffle(exercise.pairs.map((p, i) => ({ ...p, i })), `${exercise.id}-e`),
    [exercise],
  )

  const [selected, setSelected] = useState<number | null>(null)
  const [matched, setMatched] = useState<Set<number>>(new Set())
  const [wrong, setWrong] = useState<number | null>(null)
  const [mistakes, setMistakes] = useState(0)

  const complete = matched.size === exercise.pairs.length

  function tapNative(i: number, target: string) {
    if (matched.has(i)) return
    setSelected(i)
    setWrong(null)
    void audio.play(target)
  }

  function tapEnglish(i: number) {
    if (selected === null || matched.has(i)) return
    if (selected === i) {
      setMatched((m) => new Set(m).add(i))
      setSelected(null)
    } else {
      setWrong(i)
      setMistakes((n) => n + 1)
      setTimeout(() => setWrong(null), 550)
      setSelected(null)
    }
  }

  return (
    <div>
      <Prompt>Match each phrase to its meaning</Prompt>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          {natives.map((p) => (
            <button
              key={p.i}
              type="button"
              onClick={() => tapNative(p.i, p.target)}
              disabled={matched.has(p.i)}
              className={`rounded-2xl border-2 px-3 py-3 text-center transition-all active:scale-[0.98] ${
                matched.has(p.i) ? 'border-leaf/50 bg-leaf-soft opacity-60'
                  : selected === p.i ? 'border-indigo bg-indigo-soft'
                  : 'border-line bg-surface hover:border-indigo/50'
              }`}
            >
              <Script lang={lang} className="block text-lg font-bold text-ink">{p.target}</Script>
              <span className="mt-0.5 block text-[11px] italic text-ink-faint">{p.romanized}</span>
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-2">
          {englishes.map((p) => (
            <button
              key={p.i}
              type="button"
              onClick={() => tapEnglish(p.i)}
              disabled={matched.has(p.i)}
              className={`rounded-2xl border-2 px-3 py-3 text-center text-sm font-semibold transition-all active:scale-[0.98] ${
                matched.has(p.i) ? 'border-leaf/50 bg-leaf-soft opacity-60'
                  : wrong === p.i ? 'border-terracotta bg-terracotta-soft'
                  : 'border-line bg-surface hover:border-indigo/50'
              }`}
            >
              {p.english}
            </button>
          ))}
        </div>
      </div>

      {complete && (
        <>
          <Feedback correct={mistakes === 0}>
            {mistakes === 0 ? 'All matched first time.' : `All matched, with ${mistakes} slip${mistakes > 1 ? 's' : ''}.`}
          </Feedback>
          <ContinueButton onClick={() => onDone(mistakes === 0)} />
        </>
      )}
    </div>
  )
}
