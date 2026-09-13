'use client'

import Link from 'next/link'
import type { LangCode } from '@/lib/languages'
import { useProgress } from '@/lib/progress'
import { ProgressRing } from '@/components/ui/ProgressRing'
import { Script } from '@/components/ui/Script'
import { Kolam } from '@/components/ui/Motifs'
import { ProgressBackup } from './ProgressBackup'

interface LessonSummary {
  id: string
  title: string
  unitTitle: string
  count: number
}

export function HomeDashboard({
  lang, tagline, greeting, nativeName, englishName, lessons,
}: {
  lang: LangCode
  tagline: string
  greeting: string
  nativeName: string
  englishName: string
  lessons: LessonSummary[]
}) {
  const progress = useProgress(lang)
  const doneCount = lessons.filter((l) => progress.lessons[l.id]).length
  const next = lessons.find((l) => !progress.lessons[l.id]) ?? lessons[0]
  const started = doneCount > 0

  return (
    <main className="relative mx-auto w-full max-w-2xl px-4 py-10 text-center">
      <Kolam className="pointer-events-none absolute left-1/2 top-0 -z-10 w-[460px] -translate-x-1/2 text-indigo opacity-[0.06]" />

      <ProgressRing
        value={lessons.length ? doneCount / lessons.length : 0}
        label={`${Math.round((doneCount / Math.max(1, lessons.length)) * 100)}%`}
        sublabel={`${doneCount}/${lessons.length} lessons`}
      />

      <Script lang={lang} className="mt-5 block text-3xl font-extrabold text-ink">{greeting}</Script>
      <p className="mt-1 text-sm text-ink-faint">
        {nativeName} · {englishName}
      </p>
      <p className="mt-4 text-lg text-ink-soft">{tagline}</p>

      {/* Streaks lived only in the header, where they were easy to miss and
          carried none of the weight they should. */}
      {progress.streak > 0 && (
        <div className="mt-6 flex items-center justify-center gap-3 rounded-2xl border border-terracotta/30 bg-terracotta-soft px-5 py-3">
          <span className="text-2xl" aria-hidden="true">🔥</span>
          <div className="text-left">
            <p className="font-bold text-terracotta">
              {progress.streak} day{progress.streak === 1 ? '' : 's'} in a row
            </p>
            <p className="text-xs text-ink-soft">{progress.totalXP} XP earned so far</p>
          </div>
        </div>
      )}

      <Link
        href={`/${lang}/lesson/${next.id}`}
        className="mt-8 block rounded-2xl bg-indigo px-6 py-4 text-lg font-bold text-white shadow-[var(--shadow)] transition-transform active:scale-[0.99] dark:text-indigo-soft"
      >
        {started ? 'Continue learning' : 'Start learning'} <span aria-hidden="true">→</span>
      </Link>

      <div className="mt-4 rounded-2xl border border-line bg-surface p-4 text-left">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-faint">Up next</p>
        <p className="mt-1 font-bold text-ink">{next.title}</p>
        <p className="text-sm text-ink-soft">{next.unitTitle} · {next.count} exercises · ~2 min</p>
      </div>

      <div className="mt-6 flex justify-center gap-4 text-sm">
        <Link href={`/${lang}/learn`} className="font-semibold text-indigo underline-offset-4 hover:underline">
          All lessons
        </Link>
        <Link href={`/${lang}/phrasebook`} className="font-semibold text-indigo underline-offset-4 hover:underline">
          Phrasebook
        </Link>
        <Link href="/" className="text-ink-faint underline-offset-4 hover:underline">
          Change language
        </Link>
      </div>

      <ProgressBackup lang={lang} />
    </main>
  )
}
