export function ProgressRing({
  value, size = 116, stroke = 9, label, sublabel,
}: {
  /** 0..1 */
  value: number
  size?: number
  stroke?: number
  label: string
  sublabel?: string
}) {
  const r = (size - stroke) / 2
  const circumference = 2 * Math.PI * r
  const clamped = Math.max(0, Math.min(1, value))

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg
        width={size} height={size} className="-rotate-90"
        role="progressbar" aria-valuenow={Math.round(clamped * 100)} aria-valuemin={0} aria-valuemax={100}
        aria-label={sublabel ? `${label} ${sublabel}` : label}
      >
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke="var(--marigold)" strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped)}
          style={{ transition: 'stroke-dashoffset 600ms ease-out' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold text-ink">{label}</span>
        {sublabel && <span className="text-[11px] text-ink-faint">{sublabel}</span>}
      </div>
    </div>
  )
}
