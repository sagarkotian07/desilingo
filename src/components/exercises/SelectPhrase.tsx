'use client'

import { useMemo, useState } from 'react'
import type { Exercise } from '@/content/schema'
import type { LangCode } from '@/lib/languages'
import { shuffleOptions } from '@/lib/shuffle'
import { Script } from '@/components/ui/Script'
import { useAudio } from '@/lib/useAudio'
import { Prompt, OptionButton, ActionBar, Phrase, type OptionState } from './shared'

type Ex = Extract<Exercise, { type: 'select-phrase' }>

export function SelectPhrase({ exercise, lang, onDone }: { exercise: Ex; lang: LangCode; onDone: (correct: boolean) => void }) {
  const audio = useAudio(lang)
  const [chosen, setChosen] = useState<number | null>(null)
  const { options, answer } = useMemo(() => shuffleOptions(exercise.options, exercise.answer, exercise.id), [exercise])
  const answered = chosen !== null
  const correct = chosen === answer

  function stateFor(i: number): OptionState {
    if (!answered) return 'idle'
    if (i === answer) return 'correct'
    if (i === chosen) return 'wrong'
    return 'muted'
  }

  return (
    <div>
      <Prompt>How do you say</Prompt>
      <Phrase>&ldquo;{exercise.english}&rdquo;</Phrase>

      <div className="stagger grid gap-3 sm:grid-cols-2">
        {options.map((option, i) => (
          <OptionButton
            key={option.text}
            onClick={() => { if (!answered) { setChosen(i); void audio.play(option.text) } }}
            state={stateFor(i)}
            disabled={answered}
          >
            <Script lang={lang} className="block text-xl font-bold">{option.text}</Script>
            {option.romanized && <span className="block text-xs font-normal italic opacity-70">{option.romanized}</span>}
          </OptionButton>
        ))}
      </div>

      {answered && (
        <ActionBar
          correct={correct}
          detail={<><Script lang={lang} className="font-bold text-ink">{options[answer].text}</Script>{options[answer].romanized && <span className="ml-2 italic">{options[answer].romanized}</span>}</>}
          onClick={() => onDone(correct)}
        />
      )}
    </div>
  )
}
