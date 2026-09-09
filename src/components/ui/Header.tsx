'use client'

import Link from 'next/link'
import { useProgress } from '@/lib/progress'
import { LANGUAGE_CONFIG, type LangCode } from '@/lib/languages'

/**
 * Reads from the shared progress store, so XP and streak update the moment a
 * lesson finishes. In the reference app the header held its own copy of the
 * progress hook and stayed stale until you navigated away and back.
 */
export function Header({ lang, back }: { lang: LangCode; back?: { href: string; label: string } }) {
  const progress = useProgress(lang)
  const cfg = LANGUAGE_CONFIG[lang]

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-ground/85 backdrop-blur">
      <div className="mx-auto flex w-full max-w-2xl items-center gap-3 px-4 py-3">
        {back ? (
          <Link
            href={back.href}
            className="rounded-lg px-2 py-1 text-sm text-ink-soft transition-colors hover:bg-surface-sunk hover:text-ink"
          >
            <span aria-hidden="true">←</span> {back.label}
          </Link>
        ) : (
          <Link href={`/${lang}`} className="flex items-center gap-2 font-bold text-ink">
            <span aria-hidden="true">{cfg.emoji}</span> Indiligo
          </Link>
        )}

        <div className="ml-auto flex items-center gap-2 text-sm">
          {progress.streak > 0 && (
            <span
              className="rounded-full bg-terracotta-soft px-2.5 py-1 font-semibold text-terracotta"
              title={`${progress.streak}-day streak`}
            >
              <span aria-hidden="true">🔥</span> {progress.streak}
              <span className="sr-only"> day streak</span>
            </span>
          )}
          <span className="rounded-full bg-marigold-soft px-2.5 py-1 font-semibold text-ink">
            {progress.totalXP} XP
          </span>
        </div>
      </div>
    </header>
  )
}
