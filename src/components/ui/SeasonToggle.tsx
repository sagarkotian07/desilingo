'use client'

import { useSeason } from '@/lib/useSeason'

/**
 * Spring / winter, fixed to the bottom-right corner of every page. It shows
 * the season you would switch to: a snowflake in spring, a blossom in winter.
 *
 * The icon is switched by CSS, not by React: it has to agree with the palette
 * on the very first paint, and the palette is decided by CSS (OS preference
 * plus the data-season the bootstrap script sets) before React knows anything.
 */
export function SeasonToggle() {
  const { season, toggle } = useSeason()
  const label = season === 'winter' ? 'Switch to spring' : 'Switch to winter'

  return (
    <button
      type="button"
      onClick={toggle}
      title={label}
      aria-label={label}
      className="press season-toggle fixed z-40 grid h-11 w-11 place-items-center rounded-full bg-surface shadow-[var(--shadow)]"
    >
      <Blossom className="hidden dark:block" />
      <Snowflake className="dark:hidden" />
    </button>
  )
}

function Blossom({ className }: { className: string }) {
  return (
    <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="currentColor" fillOpacity=".18" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" aria-hidden="true">
      {[0, 72, 144, 216, 288].map((a) => (
        <ellipse key={a} cx="12" cy="7.2" rx="2.7" ry="4.2" transform={`rotate(${a} 12 12)`} />
      ))}
      <circle cx="12" cy="12" r="1.7" fillOpacity="1" stroke="none" />
    </svg>
  )
}

function Snowflake({ className }: { className: string }) {
  // One arm with a chevron at each end, three times round.
  const arm = 'M12 2v20M9.5 4.5 12 7l2.5-2.5M9.5 19.5 12 17l2.5 2.5'
  return (
    <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={arm} />
      <path d={arm} transform="rotate(60 12 12)" />
      <path d={arm} transform="rotate(120 12 12)" />
    </svg>
  )
}
