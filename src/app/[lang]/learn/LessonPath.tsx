'use client'

import Link from 'next/link'
import type { LangCode } from '@/lib/languages'
import { useProgress } from '@/lib/progress'
import { BlockPrintRow } from '@/components/ui/Motifs'

interface UnitSummary {
  id: string
  title: string
  emoji: string
  lessons: Array<{ id: string; title: string; count: number }>
}

export function LessonPath({ lang, units }: { lang: LangCode; units: UnitSummary[] }) {
  const progress = useProgress(lang)
  const ordered = units.flatMap((u) => u.lessons)
  const nextId = ordered.find((l) => !progress.lessons[l.id])?.id

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8">
      {units.map((unit, unitIndex) => {
        const done = unit.lessons.filter((l) => progress.lessons[l.id]).length
        // Units unlock in order: finishing the previous one opens the next.
        const previous = units[unitIndex - 1]
        const locked = previous
          ? previous.lessons.some((l) => !progress.lessons[l.id])
          : false

        return (
          <section key={unit.id} className="mb-10">
            <div className="flex items-center gap-3">
              <span className="text-2xl" aria-hidden="true">{unit.emoji}</span>
              <div className="flex-1">
                <h2 className="font-extrabold text-ink">{unit.title}</h2>
                <p className="text-xs text-ink-faint">{done}/{unit.lessons.length} complete</p>
              </div>
              {locked && (
                <span className="rounded-full bg-surface-sunk px-2.5 py-1 text-[11px] font-semibold text-ink-faint">
                  Finish {previous.title} first
                </span>
              )}
            </div>

            <BlockPrintRow className="mt-2 h-3 w-full text-marigold opacity-40" />

            <ul className="mt-4 flex flex-col gap-2.5">
              {unit.lessons.map((lesson) => {
                const result = progress.lessons[lesson.id]
                const isNext = lesson.id === nextId
                const body = (
                  <>
                    <div className="flex-1">
                      <p className="font-bold text-ink">{lesson.title}</p>
                      <p className="text-xs text-ink-faint">
                        {lesson.count} exercises · ~2 min
                        {result && ` · ${Math.round(result.accuracy * 100)}% first try`}
                      </p>
                    </div>
                    {result ? (
                      <span className="rounded-full bg-leaf-soft px-2.5 py-1 text-xs font-bold text-leaf">
                        +{result.xp} XP
                      </span>
                    ) : isNext ? (
                      <span className="rounded-full bg-indigo px-3 py-1.5 text-xs font-bold text-white dark:text-indigo-soft">
                        Start →
                      </span>
                    ) : null}
                  </>
                )

                if (locked) {
                  return (
                    <li key={lesson.id}>
                      <div className="flex cursor-not-allowed items-center gap-3 rounded-2xl border-2 border-dashed border-line bg-surface/40 px-4 py-3.5 opacity-55">
                        {body}
                      </div>
                    </li>
                  )
                }
                return (
                  <li key={lesson.id}>
                    <Link
                      href={`/${lang}/lesson/${lesson.id}`}
                      className={`flex items-center gap-3 rounded-2xl border-2 bg-surface px-4 py-3.5 shadow-[var(--shadow)] transition-all hover:-translate-y-0.5 ${
                        isNext ? 'border-indigo/60' : result ? 'border-leaf/30' : 'border-line'
                      }`}
                    >
                      {body}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </section>
        )
      })}
    </main>
  )
}
