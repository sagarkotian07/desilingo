'use client'

import { useEffect, useState } from 'react'
import type { Exercise } from '@/content/schema'
import type { LangCode } from '@/lib/languages'
import { Script } from '@/components/ui/Script'
import { SpeakerButton } from '@/components/ui/SpeakerButton'
import { useAudio, PACE_NORMAL } from '@/lib/useAudio'
import { SpeedToggle } from '@/components/ui/SpeedToggle'
import { romanMatches } from '@/lib/scoring/roman'
import { AudioTrouble } from './AudioTrouble'
import { Prompt, Feedback, ContinueButton } from './shared'

type Ex = Extract<Exercise, { type: 'listen-type-roman' }>

/**
 * Type what you hear, in Latin letters.
 *
 * Typing the native script would mean installing a keyboard most learners don't
 * have -- which is why the reference app deleted its typing exercise outright.
 * Romanization keeps the production practice and works on any device.
 */
export function ListenTypeRoman({
  exercise, lang, onDone,
}: { exercise: Ex; lang: LangCode; onDone: (correct: boolean) => void }) {
  const audio = useAudio(lang)
  const [typed, setTyped] = useState('')
  const [checked, setChecked] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const [pace, setPace] = useState(PACE_NORMAL)

  // Depends on the play callback only. Depending on the whole `audio` object
  // used to re-run this on every render and loop the clip.
  const play = audio.play
  useEffect(() => { void play(exercise.target) }, [exercise.target, play])

  const correct = checked && romanMatches(typed, exercise.romanized)

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); if (!checked && typed.trim()) setChecked(true) }}
    >
      <Prompt>Type what you hear, in English letters</Prompt>

      <div className="flex flex-col items-center rounded-3xl border border-line bg-surface p-6 shadow-[var(--shadow)]">
        <div className="flex items-center gap-3">
          <SpeakerButton
            onPlay={() => void audio.play(exercise.target, pace)}
            playing={audio.isPlaying}
            label="Play the phrase"
          />
          <SpeedToggle
            pace={pace}
            onChange={(next) => { setPace(next); void audio.play(exercise.target, next) }}
          />
        </div>

        {revealed && (
          <Script lang={lang} className="mt-4 block text-2xl font-bold">{exercise.target}</Script>
        )}

        <label htmlFor="roman" className="sr-only">Type what you hear</label>
        <input
          id="roman"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          disabled={checked}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          placeholder="type it here…"
          className="mt-5 w-full rounded-xl border-2 border-line bg-ground px-4 py-3 text-center text-lg text-ink outline-none placeholder:text-ink-faint focus:border-indigo disabled:opacity-70"
        />
      </div>


      {audio.failed && <AudioTrouble onSkip={() => onDone(false)} />}

      {/* An audio-only question is unanswerable if you cannot hear it, and
          browsers block autoplay until a gesture. This reveals the script --
          not the meaning -- so the exercise stays solvable either way. */}
      {!revealed && (
        <button
          type="button"
          onClick={() => setRevealed(true)}
          className="mx-auto mt-3 block rounded-lg px-3 py-1 text-xs text-ink-faint underline-offset-4 hover:text-ink hover:underline"
        >
          {audio.blocked ? 'Audio is blocked — show the phrase' : "Can't hear it? Show the phrase"}
        </button>
      )}

      {!checked ? (
        <button
          type="submit"
          disabled={!typed.trim()}
          className="mt-4 w-full rounded-2xl bg-indigo px-6 py-4 font-bold text-white shadow-[var(--shadow)] disabled:opacity-40 dark:text-indigo-soft"
        >
          Check
        </button>
      ) : (
        <>
          <Feedback correct={correct}>
            <Script lang={lang} className="font-bold">{exercise.target}</Script>
            <span className="ml-2 italic">{exercise.romanized}</span>
            <span className="ml-2 text-ink-soft">— {exercise.english}</span>
          </Feedback>
          <ContinueButton onClick={() => onDone(correct)} />
        </>
      )}
    </form>
  )
}
