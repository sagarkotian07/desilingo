'use client'

import { useMemo, useState } from 'react'
import type { Exercise } from '@/content/schema'
import type { LangCode } from '@/lib/languages'
import { seededShuffle } from '@/lib/shuffle'
import { Script } from '@/components/ui/Script'
import { SpeakerButton } from '@/components/ui/SpeakerButton'
import { useAudio } from '@/lib/useAudio'
import { Prompt, Feedback, ContinueButton } from './shared'

type Ex = Extract<Exercise, { type: 'word-order' }>

/** Build the sentence from tiles — production practice without a native-script
 *  keyboard. Decoy words make it a real choice rather than a sorting puzzle. */
export function WordOrder({
  exercise, lang, onDone,
}: { exercise: Ex; lang: LangCode; onDone: (correct: boolean) => void }) {
  const audio = useAudio(lang)
  const target = useMemo(() => exercise.target.split(/\s+/).filter(Boolean), [exercise.target])

  const tiles = useMemo(() => {
    const all = [...target, ...(exercise.extraWords ?? [])]
    return seededShuffle(all.map((word, i) => ({ word, id: `${i}-${word}` })), exercise.id)
  }, [target, exercise.extraWords, exercise.id])

  const [picked, setPicked] = useState<string[]>([])
  const [checked, setChecked] = useState(false)

  const pickedWords = picked.map((id) => tiles.find((t) => t.id === id)!.word)
  const correct = checked && pickedWords.join(' ') === target.join(' ')

  return (
    <div>
      <Prompt>Put the phrase together</Prompt>

      <div className="rounded-3xl border border-line bg-surface p-6 text-center shadow-[var(--shadow)]">
        <p className="text-xs uppercase tracking-widest text-ink-faint">Say this</p>
        <p className="mt-2 text-xl font-bold text-ink">&ldquo;{exercise.english}&rdquo;</p>

        <div
          className="mt-4 flex min-h-16 flex-wrap items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line bg-ground px-3 py-3"
          aria-live="polite"
        >
          {picked.length === 0 && <span className="text-sm text-ink-faint">tap the words below</span>}
          {picked.map((id) => {
            const tile = tiles.find((t) => t.id === id)!
            return (
              <button
                key={id}
                type="button"
                onClick={() => !checked && setPicked((p) => p.filter((x) => x !== id))}
                disabled={checked}
                aria-label={`Remove ${tile.word}`}
                className="rounded-xl border border-indigo/30 bg-indigo-soft px-3 py-2"
              >
                <Script lang={lang} className="text-lg font-bold text-ink">{tile.word}</Script>
              </button>
            )
          })}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {tiles.filter((t) => !picked.includes(t.id)).map((tile) => (
          <button
            key={tile.id}
            type="button"
            onClick={() => !checked && setPicked((p) => [...p, tile.id])}
            disabled={checked}
            className="rounded-xl border-2 border-line bg-surface px-4 py-3 transition-transform active:scale-95 hover:border-indigo/50"
          >
            <Script lang={lang} className="text-lg font-bold text-ink">{tile.word}</Script>
          </button>
        ))}
      </div>

      {!checked ? (
        <button
          type="button"
          onClick={() => setChecked(true)}
          disabled={picked.length === 0}
          className="mt-6 w-full rounded-2xl bg-indigo px-6 py-4 font-bold text-white shadow-[var(--shadow)] disabled:opacity-40 dark:text-indigo-soft"
        >
          Check
        </button>
      ) : (
        <>
          <Feedback correct={correct}>
            <span className="inline-flex items-center gap-2">
              <Script lang={lang} className="font-bold">{exercise.target}</Script>
              <SpeakerButton size="sm" onPlay={() => void audio.play(exercise.target)} playing={audio.isPlaying} label="Hear it" />
            </span>
          </Feedback>
          <ContinueButton onClick={() => onDone(correct)} />
        </>
      )}
    </div>
  )
}
