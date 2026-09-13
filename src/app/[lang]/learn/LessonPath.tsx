'use client'

import Link from 'next/link'
import type { LangCode } from '@/lib/languages'
import { useProgress } from '@/lib/progress'
import { BlockPrintRow } from '@/components/ui/Motifs'
import { lessonIcon } from '@/lib/lesson-icons'

interface UnitSummary {
  id: string
  title: string
  emoji: string
  lessons: Array<{ id: string; title: string; count: number }>
}

function UnitProgress({ done, total }: { done: number; total: number }) {
  const pct = total > 0 ? (done / total) * 100 : 0
  return (
    <div className="flex items-center gap-2">
      <div
        className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-sunk"
        role="progressbar"
        aria-valuenow={done}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={`${done} of ${total} lessons complete`}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-leaf to-marigold transition-[width] duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="shrink-0 text-xs font-semibold tabular-nums text-ink-faint">
        {done}/{total}
      </span>
    </div>
  )
}

export function LessonPath({ lang, units }: { lang: LangCode; units: UnitSummary[] }) {
  const progress = useProgress(lang)
  const ordered = units.flatMap((u) => u.lessons)
  const nextId = ordered.find((l) => !progress.lessons[l.id])?.id

  // Lesson numbers run continuously across units, so "Lesson 7" means the same
  // thing on the path as it does in conversation about the course.
  let lessonNumber = 0

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8">
      {units.map((unit, unitIndex) => {
        const done = unit.lessons.filter((l) => progress.lessons[l.id]).length
        const previous = units[unitIndex - 1]
        const locked = previous ? previous.lessons.some((l) => !progress.lessons[l.id]) : false

        return (
          <section key={unit.id} className="mb-10">
            <div className="flex items-center gap-3">
              <span className="text-2xl" aria-hidden="true">{unit.emoji}</span>
              <div className="flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-leaf">
                  Unit {unitIndex + 1}
                </p>
                <h2 className="font-extrabold text-ink">{unit.title}</h2>
              </div>
              {locked && (
                <span className="rounded-full bg-surface-sunk px-2.5 py-1 text-[11px] font-semibold text-ink-faint">
                  Finish {previous.title} first
                </span>
              )}
            </div>

            <div className="mt-2.5"><UnitProgress done={done} total={unit.lessons.length} /></div>
            <BlockPrintRow className="mt-2 h-3 w-full text-marigold opacity-40" />

            <ul className="mt-4 flex flex-col gap-2.5">
              {unit.lessons.map((lesson) => {
                const n = ++lessonNumber
                const result = progress.lessons[lesson.id]
                const isNext = lesson.id === nextId

                const body = (
                  <>
                    <span
                      className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-xl ${
                        result ? 'bg-leaf-soft' : isNext ? 'bg-marigold-soft' : 'bg-surface-sunk'
                      }`}
                      aria-hidden="true"
                    >
                      {result ? '✅' : lessonIcon(lesson.title)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-faint">
                        Lesson {n}
                      </p>
                      <p className="truncate font-bold text-ink">{lesson.title}</p>
                      <p className="text-xs text-ink-faint">
                        {lesson.count} exercises · ~2 min
                        {result && ` · ${Math.round(result.accuracy * 100)}% first try`}
                      </p>
                    </div>
                    {result ? (
                      <span className="shrink-0 rounded-full bg-leaf-soft px-2.5 py-1 text-xs font-bold text-leaf">
                        +{result.xp} XP
                      </span>
                    ) : isNext ? (
                      <span className="shrink-0 rounded-full bg-indigo px-3 py-1.5 text-xs font-bold text-white dark:text-indigo-soft">
                        Start →
                      </span>
                    ) : (
                      <span className="shrink-0 text-lg text-ink-faint" aria-hidden="true">›</span>
                    )}
                  </>
                )

                if (locked) {
                  return (
                    <li key={lesson.id}>
                      <div
                        aria-disabled="true"
                        className="flex cursor-not-allowed items-center gap-3 rounded-2xl border-2 border-dashed border-line bg-surface/40 px-4 py-3.5 opacity-55"
                      >
                        {body}
                      </div>
                    </li>
                  )
                }

                return (
                  <li key={lesson.id}>
                    {isNext && (
                      <div className="mb-1.5 flex items-center gap-2 rounded-xl bg-marigold-soft px-3 py-1.5">
                        <span aria-hidden="true">⭐</span>
                        <span className="text-xs font-bold text-ink">Recommended next</span>
                        <span className="h-px flex-1 bg-line" />
                        <span className="text-xs text-ink-faint" aria-hidden="true">↓</span>
                      </div>
                    )}
                    <Link
                      href={`/${lang}/lesson/${lesson.id}`}
                      className={`relative flex items-center gap-3 overflow-hidden rounded-2xl border-2 bg-surface px-4 py-3.5 shadow-[var(--shadow)] transition-all hover:-translate-y-0.5 ${
                        isNext ? 'border-marigold' : result ? 'border-leaf/30' : 'border-line'
                      }`}
                    >
                      {/* Gradient rail marking the lesson to do next. */}
                      {isNext && (
                        <span
                          className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-marigold to-terracotta"
                          aria-hidden="true"
                        />
                      )}
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
