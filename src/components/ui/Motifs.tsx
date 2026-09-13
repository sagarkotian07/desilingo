/**
 * Background motifs drawn from Indian block printing and kolam floor drawings.
 *
 * Kept very low contrast and marked aria-hidden: this is texture, not content.
 */
export function Kolam({ className = '' }: { className?: string }) {
  const dots = []
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      dots.push(<circle key={`${r}-${c}`} cx={30 + c * 35} cy={30 + r * 35} r="2.2" />)
    }
  }
  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden="true" fill="none">
      <g stroke="currentColor" strokeWidth="1.1" opacity="0.5">
        <path d="M30 100 Q65 30 100 100 T170 100" />
        <path d="M100 30 Q170 65 100 100 T100 170" />
        <path d="M30 100 Q65 170 100 100 T170 100" />
        <path d="M100 30 Q30 65 100 100 T100 170" />
        <circle cx="100" cy="100" r="66" strokeDasharray="3 7" />
      </g>
      <g fill="currentColor" opacity="0.55">{dots}</g>
    </svg>
  )
}

/** Repeating block-print border, the kind stamped on Rajasthani textiles. */
export function BlockPrintRow({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 24" className={className} aria-hidden="true" preserveAspectRatio="none">
      <g fill="currentColor" opacity="0.5">
        {Array.from({ length: 10 }, (_, i) => (
          <g key={i} transform={`translate(${i * 24} 0)`}>
            <path d="M12 3 C16 8 20 10 20 14 A8 8 0 0 1 4 14 C4 10 8 8 12 3 Z" />
          </g>
        ))}
      </g>
    </svg>
  )
}

/**
 * An oversized letterform from the language itself, sitting behind the page.
 *
 * The kolam gives the app a place; this gives each course its own. Kept at 4%
 * and aria-hidden -- it is texture, and a screen reader reading a giant
 * decorative नमस्ते would be noise.
 */
export function Letterform({
  text, lang, className = '', rotate = 12,
}: { text: string; lang: string; className?: string; rotate?: number }) {
  return (
    <span
      aria-hidden="true"
      lang={lang}
      className={`pointer-events-none select-none font-bold leading-none ${className}`}
      style={{
        fontSize: 'clamp(180px, 55vw, 340px)',
        opacity: 0.04,
        transform: `rotate(${rotate}deg)`,
      }}
    >
      {text}
    </span>
  )
}
