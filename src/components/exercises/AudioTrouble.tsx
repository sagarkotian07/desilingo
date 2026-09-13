'use client'

/**
 * Shown when a clip will not load at all.
 *
 * Silence is ambiguous -- the learner cannot tell a broken clip from their own
 * muted device -- so say what happened and offer a way past it. An exercise
 * that cannot be completed must never be a dead end.
 */
export function AudioTrouble({ onSkip }: { onSkip: () => void }) {
  return (
    <div
      role="status"
      className="animate-rise mt-4 flex items-center gap-3 rounded-2xl border-2 border-terracotta/40 bg-terracotta-soft px-4 py-3"
    >
      <span aria-hidden="true">⚠️</span>
      <p className="flex-1 text-sm text-ink">That clip wouldn&rsquo;t load.</p>
      <button
        type="button"
        onClick={onSkip}
        className="shrink-0 rounded-full bg-terracotta px-3 py-1.5 text-xs font-bold text-white"
      >
        Skip <span aria-hidden="true">→</span>
      </button>
    </div>
  )
}
