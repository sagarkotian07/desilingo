'use client'

export function SpeakerButton({
  onPlay, playing, label = 'Play', size = 'md',
}: { onPlay: () => void; playing: boolean; label?: string; size?: 'sm' | 'md' | 'lg' }) {
  const dim = { sm: 'h-10 w-10', md: 'h-14 w-14', lg: 'h-20 w-20' }[size]
  const glyph = { sm: 18, md: 24, lg: 32 }[size]
  return (
    <button
      type="button"
      onClick={onPlay}
      aria-label={label}
      className={`press ${dim} grid shrink-0 place-items-center rounded-full bg-accent text-accent-ink shadow-[var(--shadow-lift)] ${playing ? 'animate-pulse-ring' : ''}`}
    >
      {playing ? (
        <span className="flex items-end gap-[3px]" aria-hidden="true">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className="w-[3px] rounded-full bg-current"
              style={{ height: glyph * 0.6, animation: `breathe .6s ${i * .11}s ease-in-out infinite alternate` }}
            />
          ))}
        </span>
      ) : (
        <svg width={glyph} height={glyph} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M11 5 6 9H3v6h3l5 4V5Z" fill="currentColor" />
          <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      )}
    </button>
  )
}
