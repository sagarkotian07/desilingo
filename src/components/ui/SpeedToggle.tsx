'use client'

import { PACE_NORMAL, PACE_SLOW } from '@/lib/audio'

/**
 * Normal / Slow, as a segmented control with a visible active state.
 *
 * A bare "Slow" button gives no indication of which speed you are on, which
 * matters because the whole point is comparing the two.
 */
export function SpeedToggle({
  pace, onChange, disabled,
}: { pace: number; onChange: (pace: number) => void; disabled?: boolean }) {
  const options: Array<[number, string]> = [[PACE_NORMAL, 'Normal'], [PACE_SLOW, 'Slow']]

  return (
    <div
      role="group"
      aria-label="Playback speed"
      className="inline-flex overflow-hidden rounded-full border border-line bg-surface-sunk"
    >
      {options.map(([value, label]) => {
        const active = pace === value
        return (
          <button
            key={label}
            type="button"
            onClick={() => onChange(value)}
            disabled={disabled}
            aria-pressed={active}
            className={`px-4 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 ${
              active ? 'bg-indigo text-white dark:text-indigo-soft' : 'text-ink-faint hover:text-ink'
            }`}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
