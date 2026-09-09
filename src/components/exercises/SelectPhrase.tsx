'use client'

import { useMemo, useState } from 'react'
import type { Exercise } from '@/content/schema'
import type { LangCode } from '@/lib/languages'
import { shuffleOptions } from '@/lib/shuffle'
import { Script } from '@/components/ui/Script'
import { useAudio } from '@/lib/useAudio'
import { Prompt, OptionButton, Feedback, ContinueButton, type OptionState } from './shared'

type Ex = Extract<Exercise, { type: 'select-phrase' }>

export function SelectPhrase({
  exercise, lang, onDone,
}: { exercise: Ex; lang: LangCode; onDone: (correct: boolean) => void }) {
  const audio = useAudio(lang)
  const [chosen, setChosen] = useState<number | null>(null)

  const { options, answer } = useMemo(
    () => shuffleOptions(exercise.options, exercise.answer, exercise.id),
    [exercise],
  )
  const answered = chosen !== null

  function choose(i: number) {
    if (answered) return
    setChosen(i)
    void audio.play(options[i].text)
  }

  function stateFor(i: number): OptionState {
    if (!answered) return 'idle'
    if (i === answer) return 'correct'
    if (i === chosen) return 'wrong'
    return 'muted'
  }

  return (
    <div>
      <Prompt>How do you say this?</Prompt>

      <div className="rounded-3xl border border-line bg-surface p-6 text-center shadow-[var(--shadow)]">
        <p className="text-xs uppercase tracking-widest text-ink-faint">In English</p>
        <p className="mt-2 text-2xl font-bold text-ink">&ldquo;{exercise.english}&rdquo;</p>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {options.map((option, i) => (
          <OptionButton key={option.text} onClick={() => choose(i)} state={stateFor(i)} disabled={answered}>
            <Script lang={lang} className="block text-xl font-bold">{option.text}</Script>
            {option.romanized && <span className="mt-1 block text-xs italic text-ink-faint">{option.romanized}</span>}
          </OptionButton>
        ))}
      </div>

      {answered && (
        <>
          <Feedback correct={chosen === answer}>
            {chosen === answer ? null : (
              <>The right one is <Script lang={lang} className="font-bold">{options[answer].text}</Script>.</>
            )}
          </Feedback>
          <ContinueButton onClick={() => onDone(chosen === answer)} />
        </>
      )}
    </div>
  )
}
