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
      className={`press grid h-10 min-w-10 place-items-center rounded-full px-2.5 text-xs font-bold tracking-wide ${
        large ? 'bg-ink text-ground' : 'bg-surface text-ink-faint shadow-[var(--shadow)] hover:text-ink'
      }`}
    >
      Aa
    </button>
  )
}
