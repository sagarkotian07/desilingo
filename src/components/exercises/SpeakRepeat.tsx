'use client'

import { useCallback, useEffect, useState } from 'react'
import type { Exercise } from '@/content/schema'
import type { LangCode } from '@/lib/languages'
import type { PronunciationResult, Verdict } from '@/lib/scoring/score'
import { Script } from '@/components/ui/Script'
import { ScriptReveal } from '@/components/ui/ScriptReveal'
import { SpeakerButton } from '@/components/ui/SpeakerButton'
import { SpeedToggle } from '@/components/ui/SpeedToggle'
import { useAudio, PACE_NORMAL } from '@/lib/useAudio'
import { useRecorder, type Recording } from '@/lib/useRecorder'
import { clipKey } from '@/lib/clips'
import { Prompt, ActionBar } from './shared'

type Ex = Extract<Exercise, { type: 'speak-repeat' }>

const COPY: Record<Verdict, { title: string; tone: 'good' | 'near' | 'again' | 'neutral' }> = {
  perfect:          { title: 'Spot on.',            tone: 'good' },
  good:             { title: 'Nice.',               tone: 'good' },
  close:            { title: 'Close enough.',       tone: 'near' },
  retry:            { title: 'Nearly. Try the marked word.', tone: 'again' },
  'try-again':      { title: 'Try again, slowly.',  tone: 'again' },
  'not-heard':      { title: 'Didn’t catch that.',  tone: 'neutral' },
  'wrong-language': { title: 'That was English.',   tone: 'neutral' },
}
const TONE = {
  good: 'bg-leaf-soft', near: 'bg-marigold-soft', again: 'bg-terracotta-soft', neutral: 'bg-surface-sunk',
}
const MAX_ATTEMPTS = 3

export function SpeakRepeat({ exercise, lang, onDone }: { exercise: Ex; lang: LangCode; onDone: (correct: boolean) => void }) {
  const audio = useAudio(lang)
  const [result, setResult] = useState<PronunciationResult | null>(null)
  const [attempts, setAttempts] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [pace, setPace] = useState(PACE_NORMAL)

  const score = useCallback(async (rec: Recording) => {
    // Silence is answered locally: never pay to transcribe it, never call it wrong.
    if (rec.durationMs < 250 || rec.rmsPeak < 0.012) {
      setResult({ verdict: 'not-heard', score: 0, orthographicScore: 0, phoneticScore: 0, words: [], heardTranscript: '', passed: false })
      setAttempts((n) => n + 1)
      return
    }
    setSending(true)
    try {
      const key = clipKey(lang, exercise.target)
      if (!key) throw new Error('No audio for this phrase yet')
      const form = new FormData()
      form.append('audio', rec.blob, rec.filename)
      form.append('phraseKey', key)
      form.append('rmsPeak', String(rec.rmsPeak))
      const res = await fetch('/api/stt', { method: 'POST', body: form })
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(body.error ?? 'Couldn’t score that')
      }
      setResult((await res.json()) as PronunciationResult)
      setAttempts((n) => n + 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSending(false)
    }
  }, [lang, exercise.target])

  const recorder = useRecorder(score)
  const recording = recorder.state === 'recording'
  const busy = sending || recorder.state === 'processing' || recorder.state === 'requesting'

  const [elapsedMs, setElapsedMs] = useState(0)
  useEffect(() => {
    if (!recording) return
    const startedAt = Date.now()
    const id = setInterval(() => setElapsedMs(Date.now() - startedAt), 100)
    return () => clearInterval(id)
  }, [recording])
  const remaining = Math.ceil((recording ? Math.max(0, recorder.maxMs - elapsedMs) : recorder.maxMs) / 1000)

  async function toggle() {
    setError(null)
    if (!recording) { setResult(null); await recorder.start(); return }
    await recorder.stop()
  }

  const copy = result ? COPY[result.verdict] : null
  const exhausted = attempts >= MAX_ATTEMPTS

  const status =
    recorder.state === 'requesting' ? 'Allow the mic'
    : recorder.state === 'denied' ? 'Mic blocked'
    : recorder.state === 'unsupported' ? 'No mic here'
    : recording ? `${remaining}s`
    : busy ? 'Checking…'
    : attempts ? 'Again' : 'Tap to speak'

  return (
    <div>
      <Prompt>Say it</Prompt>

      <div className="text-center">
        <ScriptReveal text={exercise.target} lang={lang} active className="display text-4xl font-bold text-ink sm:text-5xl" />
        <p className="mt-2 text-base italic text-ink-faint">{exercise.romanized}</p>
        <p className="text-sm text-ink-soft">{exercise.english}</p>
        {audio.loading && <p className="mt-1 text-xs text-ink-faint">fetching audio…</p>}
        <div className="mt-5 flex items-center justify-center gap-3">
          <SpeakerButton onPlay={() => void audio.play(exercise.target, pace)} playing={audio.isPlaying} />
          <SpeedToggle pace={pace} onChange={(p) => { setPace(p); void audio.play(exercise.target, p) }} />
        </div>
      </div>

      <div className="mt-10 flex flex-col items-center">
        <button
          type="button"
          onClick={() => void toggle()}
          disabled={busy || (exhausted && !result?.passed)}
          aria-pressed={recording}
          aria-label={recording ? 'Stop' : 'Record'}
          className={`press grid h-24 w-24 place-items-center rounded-full shadow-[var(--shadow-lift)] disabled:opacity-50 ${
            recording ? 'animate-pulse-ring bg-terracotta text-white' : 'bg-ink text-ground'
          }`}
        >
          {busy ? (
            <span className="display text-2xl">…</span>
          ) : (
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor" />
              <path d="M5 11a7 7 0 0 0 14 0M12 18v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          )}
        </button>
        <p className="display mt-3 text-sm font-semibold text-ink-soft" aria-live="polite">{status}</p>
        {recording && (
          <button type="button" onClick={() => recorder.cancel()} className="mt-1 text-xs text-ink-faint underline-offset-4 hover:underline">
            Cancel
          </button>
        )}
      </div>

      {error && <p role="status" className="mt-4 rounded-2xl bg-terracotta-soft px-4 py-2 text-center text-sm text-ink">{error}</p>}

      {result && copy && (
        <div role="status" aria-live="polite" className={`animate-rise mt-6 rounded-2xl px-5 py-4 ${TONE[copy.tone]}`}>
          <p className="display text-lg font-bold text-ink">{copy.title}</p>

          {result.verdict !== 'not-heard' && result.words.length > 0 && (
            <p className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              {result.words.filter((w) => w.target !== null).map((w, i) => (
                <span key={i} className="inline-flex flex-col items-center">
                  <Script lang={lang} className={`display text-2xl font-bold ${
                    w.op === 'match' ? 'text-leaf' : w.op === 'delete' ? 'text-terracotta line-through' : 'text-terracotta'
                  }`}>{w.target}</Script>
                  {w.op === 'substitute' && w.heard && <Script lang={lang} className="text-[11px] text-ink-faint">{w.heard}</Script>}
                  {w.op === 'delete' && <span className="text-[11px] text-ink-faint">missed</span>}
                </span>
              ))}
            </p>
          )}

          {result.heardTranscript && (
            <p className="mt-3 text-xs text-ink-faint">
              Heard: <Script lang={lang} className="text-sm text-ink-soft">{result.heardTranscript}</Script>
            </p>
          )}
        </div>
      )}

      {attempts >= 1 && (
        <ActionBar
          correct={result?.passed ?? false}
          label={result?.passed ? 'Continue' : 'Continue anyway'}
          onClick={() => onDone(result?.passed ?? false)}
        />
      )}
      {attempts === 0 && (
        <button type="button" onClick={() => onDone(false)} className="mx-auto mt-6 block text-sm text-ink-faint underline-offset-4 hover:underline">
          Skip
        </button>
      )}
    </div>
  )
}
