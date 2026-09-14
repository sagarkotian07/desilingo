'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { Typewriter } from '@/components/ui/Typewriter'

/** One short line above the exercise. Keep it to a few words. */
export function Prompt({ children }: { children: string }) {
  return (
    <p className="mb-6 text-center text-xs font-bold uppercase tracking-[0.18em] text-ink-faint">
      <Typewriter text={children} />
    </p>
  )
}

export type OptionState = 'idle' | 'correct' | 'wrong' | 'muted'

export function OptionButton({
  onClick, state, disabled, children,
}: { onClick: () => void; state: OptionState; disabled?: boolean; children: ReactNode }) {
  const styles: Record<OptionState, string> = {
    idle: 'bg-surface text-ink shadow-[var(--shadow)] hover:shadow-[var(--shadow-lift)] hover:-translate-y-0.5',
    correct: 'bg-accent text-accent-ink shadow-[var(--shadow-lift)] scale-[1.02]',
    wrong: 'bg-terracotta-soft text-ink ring-2 ring-terracotta animate-shake',
    muted: 'bg-surface text-ink-faint opacity-50',
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`press min-h-16 w-full rounded-2xl px-5 py-4 text-left text-base font-semibold transition-all duration-200 ${styles[state]}`}
    >
      {children}
    </button>
  )
}

/**
 * The bars are fixed to the bottom of the viewport, so anything else living
 * down there (the theme toggle) needs to know how tall they are. Same trick
 * as LessonHeader's --header-h. jsdom has no ResizeObserver, hence the guard.
 */
function useBarHeight() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const root = document.documentElement
    const set = () => root.style.setProperty('--bar-h', `${Math.round(el.getBoundingClientRect().height)}px`)
    set()
    const observer = new ResizeObserver(set)
    observer.observe(el)
    return () => { observer.disconnect(); root.style.removeProperty('--bar-h') }
  }, [])
  return ref
}

/**
 * The bottom sheet: verdict plus the one button that moves you on.
 *
 * Fixed to the bottom so the thumb never has to travel, and it slides in so
 * the moment of feedback has a beat to it.
 */
export function ActionBar({
  correct, detail, label = 'Continue', onClick,
}: { correct?: boolean; detail?: ReactNode; label?: string; onClick: () => void }) {
  const hasVerdict = correct !== undefined
  const ref = useBarHeight()
  return (
    <div
      ref={ref}
      className={`animate-slide-up fixed inset-x-0 bottom-0 z-30 border-t ${
        !hasVerdict ? 'border-line bg-surface/95' : correct ? 'border-leaf/30 bg-leaf-soft' : 'border-terracotta/30 bg-terracotta-soft'
      } backdrop-blur`}
    >
      <div className="mx-auto flex max-w-2xl flex-col gap-3 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 [@media(max-height:520px)]:gap-2 [@media(max-height:520px)]:pt-2">
        {hasVerdict && (
          <div role="status" aria-live="polite" className="flex items-start gap-3">
            <span className="display text-2xl leading-none" aria-hidden="true">{correct ? '✓' : '✗'}</span>
            <div className="min-w-0">
              <p className="display text-lg font-bold text-ink">{correct ? 'Correct' : 'Not quite'}</p>
              {detail && <div className="mt-0.5 text-sm text-ink-soft">{detail}</div>}
            </div>
          </div>
        )}
        <button
          type="button"
          onClick={onClick}
          className={`press display w-full rounded-2xl px-6 py-4 text-lg font-bold shadow-[var(--shadow-lift)] [@media(max-height:520px)]:py-3 ${
            hasVerdict && !correct ? 'bg-ink text-ground' : 'bg-accent text-accent-ink'
          }`}
        >
          {label}
        </button>
      </div>
    </div>
  )
}

/** For exercises with a Check step before the verdict. */
export function CheckBar({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  const ref = useBarHeight()
  return (
    <div ref={ref} className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 backdrop-blur">
      <div className="mx-auto max-w-2xl px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 [@media(max-height:520px)]:pt-2">
        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          className="press display w-full rounded-2xl bg-accent px-6 py-4 text-lg font-bold text-accent-ink shadow-[var(--shadow-lift)] disabled:opacity-40 disabled:shadow-none [@media(max-height:520px)]:py-3"
        >
          Check
        </button>
      </div>
    </div>
  )
}

/** The phrase, large and unboxed. */
export function Phrase({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <div className="my-8 text-center">
      <div className="display text-4xl font-bold leading-tight text-ink sm:text-5xl">{children}</div>
      {sub && <div className="mt-3 text-base text-ink-soft">{sub}</div>}
    </div>
  )
}
