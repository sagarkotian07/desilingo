'use client'

import { useMemo, useState } from 'react'
import type { Exercise } from '@/content/schema'
import type { LangCode } from '@/lib/languages'
import { seededShuffle } from '@/lib/shuffle'
import { Script } from '@/components/ui/Script'
import { useAudio } from '@/lib/useAudio'
import { Prompt, ActionBar } from './shared'

type Ex = Extract<Exercise, { type: 'match-pairs' }>

export function MatchPairs({ exercise, lang, onDone }: { exercise: Ex; lang: LangCode; onDone: (correct: boolean) => void }) {
  const audio = useAudio(lang)
  const natives = useMemo(() => seededShuffle(exercise.pairs.map((p, i) => ({ ...p, i })), `${exercise.id}-n`), [exercise])
  const englishes = useMemo(() => seededShuffle(exercise.pairs.map((p, i) => ({ ...p, i })), `${exercise.id}-e`), [exercise])

  const [selected, setSelected] = useState<number | null>(null)
  const [matched, setMatched] = useState<Set<number>>(new Set())
  const [wrong, setWrong] = useState<number | null>(null)
  const [mistakes, setMistakes] = useState(0)
  const [announcement, setAnnouncement] = useState('')
  const complete = matched.size === exercise.pairs.length

  function tapNative(i: number, target: string) {
    if (matched.has(i)) return
    setSelected(i); setWrong(null); void audio.play(target)
  }
  function tapEnglish(i: number) {
    if (selected === null || matched.has(i)) return
    if (selected === i) {
      setMatched((m) => new Set(m).add(i)); setAnnouncement('Matched')
    } else {
      setWrong(i); setMistakes((n) => n + 1); setAnnouncement('Not a match')
      setTimeout(() => setWrong(null), 500)
    }
    setSelected(null)
  }

  const base = 'press w-full rounded-2xl px-3 py-3.5 text-center transition-all'
  const idle = 'bg-surface shadow-[var(--shadow)]'
  const done = 'bg-accent/15 text-ink-faint shadow-none'

  return (
    <div>
      <Prompt>Match them</Prompt>
      <p className="sr-only" role="status" aria-live="polite">{announcement}</p>

      <div className="grid grid-cols-2 gap-3">
        <div className="stagger flex flex-col gap-2">
          {natives.map((p) => (
            <button key={p.i} type="button" onClick={() => tapNative(p.i, p.target)} disabled={matched.has(p.i)} aria-pressed={selected === p.i}
              className={`${base} ${matched.has(p.i) ? done : selected === p.i ? 'bg-accent text-accent-ink shadow-[var(--shadow-lift)] scale-[1.03]' : idle}`}>
              <Script lang={lang} className="display block text-lg font-bold">{p.target}</Script>
              <span className="block text-[11px] italic opacity-70">{p.romanized}</span>
            </button>
          ))}
        </div>
        <div className="stagger flex flex-col gap-2">
          {englishes.map((p) => (
            <button key={p.i} type="button" onClick={() => tapEnglish(p.i)} disabled={matched.has(p.i)}
              className={`${base} text-sm font-semibold ${matched.has(p.i) ? done : wrong === p.i ? 'bg-terracotta-soft ring-2 ring-terracotta animate-shake' : idle}`}>
              {p.english}
            </button>
          ))}
        </div>
      </div>

      {complete && (
        <ActionBar
          correct={mistakes === 0}
          detail={mistakes === 0 ? 'First time.' : `${mistakes} slip${mistakes > 1 ? 's' : ''}.`}
          onClick={() => onDone(mistakes === 0)}
        />
      )}
    </div>
  )
}
