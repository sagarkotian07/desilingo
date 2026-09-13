'use client'

import { useEffect, useState } from 'react'
import type { Exercise } from '@/content/schema'
import type { LangCode } from '@/lib/languages'
import { Script } from '@/components/ui/Script'
import { SpeakerButton } from '@/components/ui/SpeakerButton'
import { SpeedToggle } from '@/components/ui/SpeedToggle'
import { useAudio, PACE_NORMAL } from '@/lib/useAudio'
import { romanMatches } from '@/lib/scoring/roman'
import { AudioTrouble } from './AudioTrouble'
import { Prompt, ActionBar, CheckBar } from './shared'

type Ex = Extract<Exercise, { type: 'listen-type-roman' }>

export function ListenTypeRoman({ exercise, lang, onDone }: { exercise: Ex; lang: LangCode; onDone: (correct: boolean) => void }) {
  const audio = useAudio(lang)
  const [typed, setTyped] = useState('')
  const [checked, setChecked] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const [pace, setPace] = useState(PACE_NORMAL)

  const play = audio.play
  useEffect(() => { void play(exercise.target) }, [exercise.target, play])

  const correct = checked && romanMatches(typed, exercise.romanized)

  return (
    <form onSubmit={(e) => { e.preventDefault(); if (!checked && typed.trim()) setChecked(true) }}>
      <Prompt>Type what you hear</Prompt>

      <div className="flex flex-col items-center gap-4">
        <SpeakerButton size="lg" onPlay={() => void play(exercise.target, pace)} playing={audio.isPlaying} />
        <SpeedToggle pace={pace} onChange={(p) => { setPace(p); void play(exercise.target, p) }} />
        {revealed && <Script lang={lang} className="display text-3xl font-bold">{exercise.target}</Script>}
        {!revealed && (
          <button type="button" onClick={() => setRevealed(true)} className="text-xs text-ink-faint underline-offset-4 hover:underline">
            {audio.blocked ? 'Show it' : 'Can’t hear? Show it'}
          </button>
        )}
      </div>

      {audio.failed && <AudioTrouble onSkip={() => onDone(false)} />}

      <label htmlFor="roman" className="sr-only">Type what you hear</label>
      <input
        id="roman"
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
        disabled={checked}
        autoComplete="off" autoCapitalize="off" spellCheck={false}
        placeholder="in english letters"
        className="display mt-8 w-full rounded-2xl bg-surface px-5 py-4 text-center text-2xl text-ink shadow-[var(--shadow)] outline-none placeholder:text-base placeholder:font-normal placeholder:text-ink-faint focus:ring-2 focus:ring-accent disabled:opacity-70"
      />

      {!checked ? (
        <CheckBar onClick={() => setChecked(true)} disabled={!typed.trim()} />
      ) : (
        <ActionBar
          correct={correct}
          detail={<><Script lang={lang} className="font-bold text-ink">{exercise.target}</Script><span className="ml-2 italic">{exercise.romanized}</span><span className="ml-2">· {exercise.english}</span></>}
          onClick={() => onDone(correct)}
        />
      )}
    </form>
  )
}
