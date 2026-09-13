'use client'

import { useCallback, useState } from 'react'
import type { Exercise } from '@/content/schema'
import type { LangCode } from '@/lib/languages'
import type { PronunciationResult, Verdict } from '@/lib/scoring/score'
import { Script } from '@/components/ui/Script'
import { SpeakerButton } from '@/components/ui/SpeakerButton'
import { useAudio, PACE_SLOW } from '@/lib/useAudio'
import { clipKey } from '@/lib/clips'
import { useRecorder, type Recording } from '@/lib/useRecorder'
import { Prompt, ContinueButton } from './shared'

type Ex = Extract<Exercise, { type: 'speak-repeat' }>

/**
 * Copy for each verdict.
 *
 * "not-heard" and "wrong-language" are deliberately not phrased as mistakes.
 * Telling someone they mispronounced a phrase when their microphone was muted,
 * or when the model simply failed, is the fastest way to make them quit — and we
 * cannot actually tell whether they were right.
 */
const COPY: Record<Verdict, { title: string; body: string; tone: 'good' | 'near' | 'again' | 'neutral' }> = {
  perfect:          { title: 'Spot on',            body: 'That sounded right.',                          tone: 'good' },
  good:             { title: 'Nicely said',        body: 'Very close to the native reading.',            tone: 'good' },
  close:            { title: 'Close enough',       body: 'Understandable — see the highlight below.',    tone: 'near' },
  retry:            { title: 'Nearly there',       body: 'Have another go at the highlighted word.',     tone: 'again' },
  'try-again':      { title: 'Give it another go', body: 'Play it slowly, then repeat.',                 tone: 'again' },
  'not-heard':      { title: "Didn't catch that",  body: 'Check your mic and speak a little louder.',    tone: 'neutral' },
  'wrong-language': { title: 'That sounded like English', body: 'Try saying the phrase itself.',         tone: 'neutral' },
}

const TONE: Record<'good' | 'near' | 'again' | 'neutral', string> = {
  good: 'border-leaf/40 bg-leaf-soft',
  near: 'border-marigold/50 bg-marigold-soft',
  again: 'border-terracotta/40 bg-terracotta-soft',
  neutral: 'border-line bg-surface-sunk',
}

const MAX_ATTEMPTS = 3

export function SpeakRepeat({
  exercise, lang, onDone,
}: { exercise: Ex; lang: LangCode; onDone: (correct: boolean) => void }) {
  const audio = useAudio(lang)
  const [result, setResult] = useState<PronunciationResult | null>(null)
  const [attempts, setAttempts] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  const score = useCallback(async (rec: Recording) => {
    // Nothing was captured, or the mic was muted. Answer locally rather than
    // paying for a transcription of silence -- and never phrase it as a mistake.
    if (rec.durationMs < 250 || rec.rmsPeak < 0.012) {
      setResult({
        verdict: 'not-heard', score: 0, orthographicScore: 0, phoneticScore: 0,
        words: [], heardTranscript: '', passed: false,
      })
      setAttempts((n) => n + 1)
      return
    }

    setSending(true)
    try {
      // Send the phrase's content-addressed key rather than the text itself:
      // the server resolves it against the manifest, so this endpoint can only
      // ever be asked to score a phrase we actually ship.
      const key = clipKey(lang, exercise.target)
      if (!key) throw new Error('No audio is available for this phrase yet')

      const form = new FormData()
      form.append('audio', rec.blob, rec.filename)
      form.append('phraseKey', key)
      form.append('rmsPeak', String(rec.rmsPeak))

      const res = await fetch('/api/stt', { method: 'POST', body: form })
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(body.error ?? 'Could not score that attempt')
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

  async function toggle() {
    setError(null)
    if (!recording) {
      // Clear the previous verdict before recording again, otherwise the old
      // feedback stays on screen and its "Continue anyway" lets the learner
      // advance on a result that no longer reflects what they just said.
      setResult(null)
      await recorder.start()
      return
    }
    // Scoring is driven by the recorder's callback, so the 8-second cap and a
    // manual stop take exactly the same path.
    await recorder.stop()
  }

  const copy = result ? COPY[result.verdict] : null
  // After a few tries we stop asking. Speaking never blocks progress, and an
  // unbounded retry loop on a phrase the model keeps mishearing is dispiriting.
  const exhausted = attempts >= MAX_ATTEMPTS

  return (
    <div>
      <Prompt>Listen, then say it out loud</Prompt>

      <div className="rounded-3xl border border-line bg-surface p-6 text-center shadow-[var(--shadow)]">
        <Script lang={lang} className="block text-3xl font-bold sm:text-4xl">{exercise.target}</Script>
        <p className="mt-1 text-sm italic text-terracotta">{exercise.romanized}</p>
        <p className="mt-1 text-sm text-ink-soft">{exercise.english}</p>

        <div className="mt-4 flex items-center justify-center gap-3">
          <SpeakerButton onPlay={() => void audio.play(exercise.target)} playing={audio.isPlaying} label="Play at normal speed" />
          <button
            type="button"
            onClick={() => void audio.play(exercise.target, PACE_SLOW)}
            className="rounded-full border border-line bg-surface px-3 py-2 text-xs font-semibold text-ink-soft transition-colors hover:border-indigo/40 hover:text-ink"
          >
            Slow
          </button>
        </div>
      </div>

      {/* A real button: focusable, space/enter operable, with a live label.
          The reference app bound recording to onMouseDown/onTouchStart only,
          which made this exercise impossible to do from a keyboard. */}
      <div className="mt-6 flex flex-col items-center">
        <button
          type="button"
          onClick={() => void toggle()}
          disabled={busy || (exhausted && !result?.passed)}
          aria-pressed={recording}
          aria-label={recording ? 'Stop recording' : 'Start recording'}
          className={`grid h-20 w-20 place-items-center rounded-full border-2 transition-all active:scale-95 disabled:opacity-60 ${
            recording
              ? 'animate-pulse-ring border-terracotta bg-terracotta text-white'
              : 'border-indigo/30 bg-surface text-indigo hover:border-indigo'
          }`}
        >
          {busy ? (
            <span className="text-xs font-semibold">···</span>
          ) : (
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor" />
              <path d="M5 11a7 7 0 0 0 14 0M12 18v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          )}
        </button>
        <p className="mt-2 text-xs text-ink-faint" aria-live="polite">
          {recorder.state === 'denied' && 'Microphone permission was denied.'}
          {recorder.state === 'unsupported' && "This browser can't record audio."}
          {recording && 'Listening — tap again when done'}
          {busy && 'Checking your pronunciation…'}
          {!recording && !busy && recorder.state === 'idle' && (attempts ? 'Try again' : 'Tap to record')}
        </p>
      </div>

      {error && (
        <p role="status" className="mt-4 rounded-xl bg-terracotta-soft px-4 py-2 text-center text-sm text-ink">{error}</p>
      )}

      {result && copy && (
        <div role="status" aria-live="polite" className={`animate-rise mt-5 rounded-2xl border-2 px-4 py-4 ${TONE[copy.tone]}`}>
          <p className="font-bold text-ink">{copy.title}</p>
          <p className="mt-0.5 text-sm text-ink-soft">{copy.body}</p>

          {/* Word-level diff. A single number tells a learner nothing they can
              act on; showing which word slipped is the whole point. */}
          {result.verdict !== 'not-heard' && result.words.length > 0 && (
            <p className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1">
              {result.words.filter((w) => w.target !== null).map((w, i) => (
                <span key={i} className="inline-flex flex-col items-center">
                  <Script
                    lang={lang}
                    className={`text-xl font-bold ${
                      w.op === 'match' ? 'text-leaf'
                        : w.op === 'delete' ? 'text-terracotta line-through decoration-2'
                        : 'text-terracotta'
                    }`}
                  >
                    {w.target}
                  </Script>
                  {w.op === 'substitute' && w.heard && (
                    <Script lang={lang} className="text-[11px] text-ink-faint">heard: {w.heard}</Script>
                  )}
                  {w.op === 'delete' && <span className="text-[11px] text-ink-faint">not heard</span>}
                </span>
              ))}
            </p>
          )}

          {/* Always show the raw transcript. When the model is the one that got
              it wrong, the learner can see that for themselves instead of
              concluding the app is broken. */}
          {result.heardTranscript && (
            <p className="mt-3 border-t border-line/60 pt-2 text-xs text-ink-faint">
              We heard: <Script lang={lang} className="text-sm text-ink-soft">{result.heardTranscript}</Script>
            </p>
          )}
        </div>
      )}

      {/* Speaking never gates progress. We cannot verify who is right, so an
          inescapable loop insisting the learner is wrong is not a trade worth
          making. */}
      {(result?.passed || exhausted || attempts >= 1) && (
        <ContinueButton
          onClick={() => onDone(result?.passed ?? false)}
          label={result?.passed ? 'Continue' : 'Continue anyway'}
        />
      )}
      {!result && attempts === 0 && (
        <button
          type="button"
          onClick={() => onDone(false)}
          className="mt-4 w-full rounded-xl px-4 py-2 text-sm text-ink-faint underline-offset-4 hover:underline"
        >
          Skip this one
        </button>
      )}
    </div>
  )
}
