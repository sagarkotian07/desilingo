'use client'

import type { ReactNode } from 'react'

export function Prompt({ children }: { children: ReactNode }) {
  return <p className="mb-5 text-center text-sm font-medium tracking-wide text-ink-soft">{children}</p>
}

export type OptionState = 'idle' | 'correct' | 'wrong' | 'muted'

export function OptionButton({
  onClick, state, disabled, children,
}: {
  onClick: () => void
  state: OptionState
  disabled?: boolean
  children: ReactNode
}) {
  const styles: Record<OptionState, string> = {
    idle: 'border-line bg-surface hover:border-indigo/50 hover:bg-indigo-soft/40',
    correct: 'border-leaf bg-leaf-soft text-ink',
    wrong: 'border-terracotta bg-terracotta-soft text-ink',
    muted: 'border-line/60 bg-surface/50 text-ink-faint',
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-disabled={disabled}
      className={`min-h-16 rounded-2xl border-2 px-4 py-3 text-center transition-all active:scale-[0.98] disabled:active:scale-100 ${styles[state]}`}
    >
      {children}
    </button>
  )
}

/**
 * Result banner.
 *
 * aria-live so a screen reader announces the outcome; the reference app rendered
 * feedback silently, which meant a non-sighted learner got no signal at all.
 */
export function Feedback({
  correct, children,
}: { correct: boolean; children?: ReactNode }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`animate-rise mt-5 rounded-2xl border-2 px-4 py-3 text-sm ${
        correct ? 'border-leaf/40 bg-leaf-soft text-ink' : 'border-terracotta/40 bg-terracotta-soft text-ink'
      }`}
    >
      <span className="font-bold">{correct ? 'Correct' : 'Not quite'}</span>
      {children ? <span className="ml-2">{children}</span> : null}
    </div>
  )
}

export function ContinueButton({ onClick, label = 'Continue' }: { onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="animate-rise mt-4 w-full rounded-2xl bg-indigo px-6 py-4 text-base font-bold text-white shadow-[var(--shadow)] transition-transform active:scale-[0.99] dark:text-indigo-soft"
    >
      {label} <span aria-hidden="true">→</span>
    </button>
  )
}
