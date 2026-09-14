'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import type { LangCode } from '@/lib/languages'
import { localToday, useProgress } from '@/lib/progress'
import { selectDue } from '@/lib/phrase-memory'
import { Script } from '@/components/ui/Script'
import { Mor } from '@/components/ui/Mor'

interface LessonSummary { id: string; title: string; unitTitle: string; count: number }

function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="rounded-2xl bg-surface px-4 py-3 text-center shadow-[var(--shadow)]">
      <p className="display text-2xl font-extrabold text-ink">{value}</p>
      <p className="text-xs text-ink-faint">{label}</p>
    </div>
  )
}

export function HomeDashboard({
  lang, tagline, greeting, glyph, englishName, lessons, known,
}: {
  lang: LangCode; tagline: string; greeting: string; glyph: string; englishName: string
  lessons: LessonSummary[]
  /** Every phrase the course can review. Records for phrases since edited out are ignored. */
  known: string[]
}) {
  const progress = useProgress(lang)
  const knownSet = useMemo(() => new Set(known), [known])
  // Empty until hydrated (the server snapshot has no phrases), so no mismatch.
  const due = selectDue(progress.phrases, knownSet, localToday()).length
  const done = lessons.filter((l) => progress.lessons[l.id]).length
  const next = lessons.find((l) => !progress.lessons[l.id]) ?? lessons[0]
  const allDone = done === lessons.length

  return (
    <main className="relative mx-auto w-full max-w-3xl px-5 pb-20 pt-6">
      <section className="stagger relative pt-8">
        <div className="flex items-center gap-5">
          {/* The language's own letter is the mark. */}
          <Script
            lang={lang}
            aria-hidden="true"
            className="grid h-24 w-24 shrink-0 place-items-center rounded-3xl bg-accent text-6xl font-bold leading-none text-accent-ink shadow-[var(--shadow-lift)]"
          >
            {glyph}
          </Script>
          <div className="min-w-0">
            <Script lang={lang} className="display block text-4xl font-extrabold text-ink sm:text-5xl">{greeting}</Script>
            <p className="mt-1 text-ink-soft">{tagline}</p>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-3 gap-2">
          <Stat value={progress.streak} label="day streak" />
          <Stat value={progress.totalXP} label="XP" />
          <Stat value={`${done}/${lessons.length}`} label="lessons" />
        </div>

        <Link
          href={`/${lang}/lesson/${next.id}`}
          className="press mt-6 flex items-center gap-4 rounded-2xl bg-accent px-6 py-5 text-accent-ink shadow-[var(--shadow-lift)]"
        >
          <span className="flex-1">
            <span className="block text-xs font-semibold uppercase tracking-wider opacity-70">
              {allDone ? 'Practice' : done ? 'Next' : 'Start'}
            </span>
            <span className="display block text-xl font-bold">{next.title}</span>
          </span>
          <Mor pose="wave" className="-my-3 w-16 shrink-0 sm:w-20" />
          <span className="display text-3xl" aria-hidden="true">→</span>
        </Link>

        {due > 0 && (
          <Link
            href={`/${lang}/review`}
            className="press mt-3 flex items-center gap-4 rounded-2xl bg-surface px-5 py-4 shadow-[var(--shadow)]"
          >
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent/15 text-xl text-accent" aria-hidden="true">↻</span>
            <span className="flex-1">
              <span className="display block font-bold text-ink">Review</span>
              <span className="block text-sm text-ink-faint">{due} {due === 1 ? 'phrase' : 'phrases'} · 1 min</span>
            </span>
            <span className="display text-2xl text-ink-faint" aria-hidden="true">→</span>
          </Link>
        )}

        <nav className="mt-6 flex gap-5 text-sm font-semibold [&>a]:-my-3 [&>a]:py-3.5">
          <Link href={`/${lang}/learn`} className="text-ink underline-offset-4 hover:underline">All lessons</Link>
          <Link href={`/${lang}/phrasebook`} className="text-ink underline-offset-4 hover:underline">Phrasebook</Link>
          <Link href="/" className="ml-auto text-ink-faint underline-offset-4 hover:underline">Not {englishName}?</Link>
        </nav>
      </section>

    </main>
  )
}
