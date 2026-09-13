'use client'

import Link from 'next/link'
import { useProgress } from '@/lib/progress'
import type { LangCode } from '@/lib/languages'
import { FontSizeToggle } from './FontSizeToggle'

export function Header({ lang, back }: { lang: LangCode; back?: { href: string; label: string } }) {
  const progress = useProgress(lang)

  return (
    <header className="sticky top-0 z-20 bg-ground/85 backdrop-blur">
      <div className="mx-auto flex w-full max-w-3xl items-center gap-3 px-5 py-3">
        {back ? (
          <Link href={back.href} className="press rounded-full bg-surface px-3 py-1.5 text-sm font-semibold text-ink shadow-[var(--shadow)]">
            ← {back.label}
          </Link>
        ) : (
          <Link href="/" className="display text-lg font-extrabold text-ink">Desilingo</Link>
        )}
        <div className="ml-auto flex items-center gap-2 text-sm">
          <FontSizeToggle />
          {progress.streak > 0 && (
            <span className="rounded-full bg-terracotta-soft px-2.5 py-1 font-bold text-terracotta" title={`${progress.streak}-day streak`}>
              🔥 {progress.streak}<span className="sr-only"> day streak</span>
            </span>
          )}
          <span className="display rounded-full bg-accent px-3 py-1 font-bold text-accent-ink">{progress.totalXP} XP</span>
        </div>
      </div>
    </header>
  )
}
