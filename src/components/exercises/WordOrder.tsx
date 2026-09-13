'use client'

import { useMemo, useState } from 'react'
import type { Exercise } from '@/content/schema'
import type { LangCode } from '@/lib/languages'
import { seededShuffle } from '@/lib/shuffle'
import { Script } from '@/components/ui/Script'
import { SpeakerButton } from '@/components/ui/SpeakerButton'
import { useAudio } from '@/lib/useAudio'
import { Prompt, ActionBar, CheckBar, Phrase } from './shared'

type Ex = Extract<Exercise, { type: 'word-order' }>

export function WordOrder({ exercise, lang, onDone }: { exercise: Ex; lang: LangCode; onDone: (correct: boolean) => void }) {
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

  const tile = 'press display rounded-xl px-4 py-3 text-lg font-bold shadow-[var(--shadow)]'

  return (
    <div>
      <Prompt>Build it</Prompt>
      <Phrase>&ldquo;{exercise.english}&rdquo;</Phrase>

      <div
        aria-live="polite"
        className="flex min-h-20 flex-wrap items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line px-3 py-3"
      >
        {picked.map((id) => {
          const t = tiles.find((x) => x.id === id)!
          return (
            <button key={id} type="button" disabled={checked} aria-label={`Remove ${t.word}`}
              onClick={() => setPicked((p) => p.filter((x) => x !== id))}
              className={`${tile} bg-accent text-accent-ink`}>
              <Script lang={lang}>{t.word}</Script>
            </button>
          )
        })}
      </div>

      <div className="stagger mt-6 flex flex-wrap justify-center gap-2">
        {tiles.filter((t) => !picked.includes(t.id)).map((t) => (
          <button key={t.id} type="button" disabled={checked}
            onClick={() => setPicked((p) => [...p, t.id])}
            className={`${tile} bg-surface text-ink`}>
            <Script lang={lang}>{t.word}</Script>
          </button>
        ))}
      </div>

      {!checked ? (
        <CheckBar onClick={() => setChecked(true)} disabled={picked.length === 0} />
      ) : (
        <ActionBar
          correct={correct}
          detail={
            <span className="inline-flex items-center gap-2">
              <Script lang={lang} className="font-bold text-ink">{exercise.target}</Script>
              <SpeakerButton size="sm" onPlay={() => void audio.play(exercise.target)} playing={audio.isPlaying} />
            </span>
          }
          onClick={() => onDone(correct)}
        />
      )}
    </div>
  )
}
