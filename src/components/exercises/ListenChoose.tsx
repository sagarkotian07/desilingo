'use client'

import { useEffect, useMemo, useState } from 'react'
import type { Exercise } from '@/content/schema'
import type { LangCode } from '@/lib/languages'
import { shuffleOptions } from '@/lib/shuffle'
import { Script } from '@/components/ui/Script'
import { ScriptReveal } from '@/components/ui/ScriptReveal'
import { SpeakerButton } from '@/components/ui/SpeakerButton'
import { useAudio } from '@/lib/useAudio'
import { AudioTrouble } from './AudioTrouble'
import { Prompt, OptionButton, ActionBar, type OptionState } from './shared'

type Ex = Extract<Exercise, { type: 'listen-choose' }>

export function ListenChoose({ exercise, lang, onDone }: { exercise: Ex; lang: LangCode; onDone: (correct: boolean) => void }) {
  const audio = useAudio(lang)
  const [chosen, setChosen] = useState<number | null>(null)
  const [revealed, setRevealed] = useState(false)

  const { options, answer } = useMemo(
    () => shuffleOptions(exercise.options, exercise.answer, exercise.id),
    [exercise],
  )

  const play = audio.play
  useEffect(() => { void play(exercise.target) }, [exercise.target, play])

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
      <Prompt>What does it mean?</Prompt>

      <div className="flex flex-col items-center gap-5">
        <SpeakerButton size="lg" onPlay={() => void play(exercise.target)} playing={audio.isPlaying} />

        <div className="display min-h-16 text-center text-4xl font-bold text-ink">
          {revealed ? (
            <ScriptReveal text={exercise.target} lang={lang} active />
          ) : (
            <Script lang={lang} className="text-ink-faint/40">• • •</Script>
          )}
        </div>

        {revealed ? (
          <p className="-mt-3 text-sm italic text-ink-faint">{exercise.romanized}</p>
        ) : (
          <div className="-mt-2 flex flex-col items-center gap-1">
            {exercise.hint && <p className="text-sm text-ink-faint">{exercise.hint}</p>}
            <button type="button" onClick={() => setRevealed(true)} className="text-xs text-ink-faint underline-offset-4 hover:underline">
              {audio.blocked ? 'Show it' : 'Can’t hear? Show it'}
            </button>
          </div>
        )}
        {audio.loading && <p className="text-xs text-ink-faint">fetching audio…</p>}
      </div>

      {audio.failed && <AudioTrouble onSkip={() => onDone(false)} />}

      <div className="stagger mt-8 grid gap-3 sm:grid-cols-2">
        {options.map((option, i) => (
          <OptionButton key={option} onClick={() => { if (!answered) { setChosen(i); setRevealed(true) } }} state={stateFor(i)} disabled={answered}>
            {option}
          </OptionButton>
        ))}
      </div>

      {answered && (
        <ActionBar
          correct={correct}
          detail={correct ? undefined : <>It means <span className="font-semibold text-ink">{options[answer]}</span></>}
          onClick={() => onDone(correct)}
        />
      )}
    </div>
  )
}
