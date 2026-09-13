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
import { Prompt, OptionButton, Feedback, ContinueButton, type OptionState } from './shared'

type Ex = Extract<Exercise, { type: 'listen-choose' }>

export function ListenChoose({
  exercise, lang, onDone,
}: { exercise: Ex; lang: LangCode; onDone: (correct: boolean) => void }) {
  const audio = useAudio(lang)
  const [chosen, setChosen] = useState<number | null>(null)
  const [revealed, setRevealed] = useState(false)

  const { options, answer } = useMemo(
    () => shuffleOptions(exercise.options, exercise.answer, exercise.id),
    [exercise],
  )

  // Play on arrival. If the browser blocks autoplay this quietly does nothing
  // and the learner uses the speaker button instead.
  // Depends on the play callback only. Depending on the whole `audio` object
  // used to re-run this on every render and loop the clip.
  const play = audio.play
  useEffect(() => { void play(exercise.target) }, [exercise.target, play])

  const answered = chosen !== null

  function choose(i: number) {
    if (answered) return
    setChosen(i)
    setRevealed(true)
  }

  function stateFor(i: number): OptionState {
    if (!answered) return 'idle'
    if (i === answer) return 'correct'
    if (i === chosen) return 'wrong'
    return 'muted'
  }

  return (
    <div>
      <Prompt>Listen, then choose what it means</Prompt>

      <div
        className={`rounded-3xl border-2 bg-surface p-6 text-center shadow-[var(--shadow)] ${
          audio.loading ? 'animate-border-pulse border-line' : 'border-marigold/40'
        }`}
      >
        <div className="flex items-center justify-center gap-4">
          {/* The phrase stays hidden until answered: this is a listening
              exercise, and showing the text up front turns it into a reading
              one. Once revealed it fills in grapheme by grapheme, which is
              where the sound-to-script connection actually gets made. */}
          {revealed ? (
            <ScriptReveal
              text={exercise.target}
              lang={lang}
              active
              className="text-3xl font-bold sm:text-4xl"
            />
          ) : (
            <Script lang={lang} className="text-3xl font-bold sm:text-4xl">••••</Script>
          )}
          <SpeakerButton onPlay={() => void audio.play(exercise.target)} playing={audio.isPlaying} label="Play the phrase" />
        </div>
        {revealed && <p className="mt-2 text-sm italic text-terracotta">{exercise.romanized}</p>}
        {/* Clips are static files, so this is normally imperceptible -- but the
            repair route can take a few seconds, and silence with no explanation
            reads as a broken app. */}
        {audio.loading && (
          <p className="mt-2 text-xs text-ink-faint">fetching audio, this can take a moment…</p>
        )}
        {exercise.hint && !revealed && (
          <p className="mt-3 text-xs text-ink-faint"><span aria-hidden="true">💡</span> {exercise.hint}</p>
        )}
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

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {options.map((option, i) => (
          <OptionButton key={option} onClick={() => choose(i)} state={stateFor(i)} disabled={answered}>
            <span className="font-semibold">{option}</span>
          </OptionButton>
        ))}
      </div>

      {answered && (
        <>
          <Feedback correct={chosen === answer}>
            {chosen === answer ? null : <>It means &ldquo;{options[answer]}&rdquo;.</>}
          </Feedback>
          <ContinueButton onClick={() => onDone(chosen === answer)} />
        </>
      )}
    </div>
  )
}
