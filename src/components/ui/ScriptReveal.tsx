'use client'

import { useEffect, useMemo, useState } from 'react'
import { graphemes } from '@/lib/scoring/normalize'
import { useReducedMotion } from '@/lib/useReducedMotion'
import type { LangCode } from '@/lib/languages'
import { Script } from './Script'

const STEP_MS = 60

/**
 * Reveals native script one grapheme cluster at a time.
 *
 * Clusters, not code points: a Devanagari syllable is several code points and
 * revealing them individually would flash half-formed letterforms. The same
 * Intl.Segmenter clustering the pronunciation scorer uses.
 */
export function ScriptReveal({
  text, lang, active, className = '',
}: { text: string; lang: LangCode; active: boolean; className?: string }) {
  const reduced = useReducedMotion()
  const clusters = useMemo(() => graphemes(text, lang), [text, lang])
  // Progress is tagged with the text it belongs to, so a new phrase resets by
  // derivation rather than by setting state during an effect.
  const [progress, setProgress] = useState({ key: '', shown: 0 })
  const key = `${lang}|${text}|${active}`
  const shown = !active ? 0
    : reduced ? clusters.length
    : progress.key === key ? progress.shown
    : 0

  useEffect(() => {
    if (!active || reduced) return
    let i = 0
    const id = setInterval(() => {
      i += 1
      setProgress({ key, shown: i })
      if (i >= clusters.length) clearInterval(id)
    }, STEP_MS)
    return () => clearInterval(id)
  }, [key, active, reduced, clusters.length])

  // The full string stays in the accessibility tree throughout: a screen reader
  // should not have to watch an animation to learn the phrase.
  return (
    <span className={className}>
      <span className="sr-only">{text}</span>
      <Script lang={lang} className="block" aria-hidden="true">
        {active ? clusters.slice(0, shown).join('') : ''}
        {/* Keeps the line height stable while the text fills in. */}
        {shown < clusters.length && <span className="opacity-0">{clusters.slice(shown).join('')}</span>}
      </Script>
    </span>
  )
}
