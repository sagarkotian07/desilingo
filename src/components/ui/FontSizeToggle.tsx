'use client'

import { useFontSize } from '@/lib/useFontSize'

/** The `Aa` control. Small, always reachable, and never hidden behind a menu. */
export function FontSizeToggle() {
  const { fontSize, toggle } = useFontSize()
  const large = fontSize === 'large'

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={large}
      title={large ? 'Switch to normal text' : 'Switch to large text'}
      aria-label={large ? 'Switch to normal text size' : 'Switch to large text size'}
      className={`rounded-full border px-2.5 py-1 text-xs font-bold tracking-wide transition-colors ${
        large
          ? 'border-indigo bg-indigo text-white dark:text-indigo-soft'
          : 'border-line bg-surface-sunk text-ink-faint hover:text-ink'
      }`}
    >
      Aa
    </button>
  )
}
