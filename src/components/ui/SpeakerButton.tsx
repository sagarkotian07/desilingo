'use client'

/** Play/replay control for a clip. A real button, so it is keyboard-reachable —
 *  the reference app's audio and mic controls were mouse/touch handlers only. */
export function SpeakerButton({
  onPlay, playing, label = 'Play audio', size = 'md',
}: {
  onPlay: () => void
  playing: boolean
  label?: string
  size?: 'sm' | 'md'
}) {
  const dim = size === 'sm' ? 'h-9 w-9' : 'h-12 w-12'
  return (
    <button
      type="button"
      onClick={onPlay}
      aria-label={label}
      className={`${dim} grid shrink-0 place-items-center rounded-full border border-line bg-surface text-indigo shadow-sm transition-transform active:scale-95 hover:border-indigo/40`}
    >
      {playing ? (
        <span className="flex items-end gap-[3px]" aria-hidden="true">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className="w-[3px] rounded-full bg-current"
              style={{ height: 14, animation: `pop 0.5s ${i * 0.11}s ease-in-out infinite alternate` }}
            />
          ))}
        </span>
      ) : (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M11 5 6 9H3v6h3l5 4V5Z" fill="currentColor" />
          <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12"
                stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      )}
    </button>
  )
}
