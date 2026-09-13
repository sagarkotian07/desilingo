'use client'

import { useEffect } from 'react'
import type { Exercise, Lead } from '@/content/schema'
import type { LangCode } from '@/lib/languages'
import { useAudio } from '@/lib/useAudio'
import { Script } from '@/components/ui/Script'
import { ScriptReveal } from '@/components/ui/ScriptReveal'
import { SpeakerButton } from '@/components/ui/SpeakerButton'

/**
 * The other person's line, before your turn. Heard first, then read.
 *
 * Only listen-choose autoplays among the scene turn types, and a listen turn
 * never has a lead, so this autoplay can't talk over the exercise's.
 */
export function SceneLead({ lead, lang, other }: { lead: Lead; lang: LangCode; other: string }) {
  const audio = useAudio(lang)
  const play = audio.play
  useEffect(() => { void play(lead.text) }, [lead.text, play])

  return (
    <div className="animate-rise flex items-start gap-3">
      <SpeakerButton size="sm" label={`Hear ${other} again`} onPlay={() => void play(lead.text)} playing={audio.isPlaying} />
      <div className="min-w-0 rounded-2xl rounded-tl-md bg-surface px-4 py-3 shadow-[var(--shadow)]">
        <p className="text-[11px] font-bold uppercase tracking-wider text-ink-faint">{other}</p>
        <ScriptReveal text={lead.text} lang={lang} active className="display mt-0.5 block text-2xl font-bold text-ink" />
        <p className="mt-1 text-sm italic text-ink-faint">{lead.romanized}</p>
        <p className="text-sm text-ink-soft">{lead.english}</p>
      </div>
    </div>
  )
}

interface Line { who: 'them' | 'you'; text: string; english: string }

/** The lines a finished turn added: their lead, then yours. A listen turn's
 *  target is their line. Shown as scripted, whatever you actually answered. */
function linesOf(turns: Exercise[]): Line[] {
  return turns.flatMap((ex): Line[] => {
    if (ex.type === 'match-pairs') return []
    if (ex.type === 'listen-choose') return [{ who: 'them', text: ex.target, english: ex.english }]
    const you: Line = { who: 'you', text: ex.target, english: ex.english }
    return ex.lead ? [{ who: 'them', text: ex.lead.text, english: ex.lead.english }, you] : [you]
  })
}

/** The conversation so far, muted: context, not content. */
export function SceneTranscript({ turns, lang, keep = 2 }: { turns: Exercise[]; lang: LangCode; keep?: number }) {
  if (turns.length === 0) return null
  const earlier = turns.length - keep
  return (
    <ol aria-label="So far" className="flex flex-col gap-1.5">
      {earlier > 0 && <li className="text-center text-[11px] text-ink-faint">{earlier} earlier</li>}
      {linesOf(turns.slice(-keep)).map((line, i) => (
        <li
          key={i}
          className={`max-w-[85%] rounded-2xl px-3 py-1.5 text-sm ${
            line.who === 'you' ? 'self-end rounded-br-md bg-accent/15' : 'self-start rounded-bl-md bg-surface/70'
          }`}
        >
          <Script lang={lang} className="font-semibold text-ink-soft">{line.text}</Script>
          <span className="ml-2 text-xs text-ink-faint">{line.english}</span>
        </li>
      ))}
    </ol>
  )
}
