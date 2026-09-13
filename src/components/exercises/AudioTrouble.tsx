'use client'

export function AudioTrouble({ onSkip }: { onSkip: () => void }) {
  return (
    <div role="status" className="animate-rise mt-4 flex items-center gap-3 rounded-2xl bg-terracotta-soft px-4 py-3">
      <p className="flex-1 text-sm text-ink">Audio didn&rsquo;t load.</p>
      <button type="button" onClick={onSkip} className="press rounded-full bg-terracotta px-3 py-1.5 text-xs font-bold text-white">
        Skip
      </button>
    </div>
  )
}
