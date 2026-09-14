'use client'

import { useTheme } from '@/lib/useTheme'

/**
 * Sun / moon, fixed to the bottom-right corner of every page.
 *
 * The icon is switched by CSS, not by React: it has to agree with the palette
 * on the very first paint, and the palette is decided by CSS (OS preference
 * plus the data-theme the bootstrap script sets) before React knows anything.
 */
export function ThemeToggle() {
  const { theme, toggle } = useTheme()
  const label = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'

  return (
    <button
      type="button"
      onClick={toggle}
      title={label}
      aria-label={label}
      className="press theme-toggle fixed z-40 grid h-11 w-11 place-items-center rounded-full bg-surface text-ink-faint shadow-[var(--shadow)] hover:text-ink"
    >
      <svg className="hidden dark:block" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
      </svg>
      <svg className="dark:hidden" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z" />
      </svg>
    </button>
  )
}
