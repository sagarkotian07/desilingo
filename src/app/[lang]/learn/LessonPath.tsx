'use client'

import Link from 'next/link'
import type { LangCode } from '@/lib/languages'
import { useProgress } from '@/lib/progress'
import { lessonIcon } from '@/lib/lesson-icons'

interface UnitSummary {
  id: string
  title: string
  emoji: string
  lessons: Array<{ id: string; title: string; count: number; scene: boolean }>
}

type NodeState = 'done' | 'current' | 'open' | 'locked'

const ROW = 152          // vertical rhythm between nodes
const SWING = [0, 64, 96, 64, 0, -64, -96, -64] // horizontal drift, px from centre
const NODE = 76

/**
 * Lessons as a trail, not a list.
 *
 * Each node drifts left and right down the page, so progress has a shape you
 * can see at a glance and the next step is always obvious. The trail behind
 * you fills in your course colour.
 */
export function LessonPath({ lang, units }: { lang: LangCode; units: UnitSummary[] }) {
  const progress = useProgress(lang)

  // Flatten into rows: a unit band, then its nodes.
  type Row =
    | { kind: 'unit'; unit: UnitSummary; index: number; locked: boolean; done: number }
    // n numbers lessons only; a scene is named, not numbered.
    | { kind: 'node'; lesson: UnitSummary['lessons'][number]; state: NodeState; n: number; x: number }

  const rows: Row[] = []
  let n = 0
  let nodeIndex = 0
  let foundCurrent = false

  units.forEach((unit, ui) => {
    const previous = units[ui - 1]
    const locked = previous ? previous.lessons.some((l) => !progress.lessons[l.id]) : false
    const done = unit.lessons.filter((l) => progress.lessons[l.id]).length
    rows.push({ kind: 'unit', unit, index: ui, locked, done })
    // A scene uses the unit's phrases, so it opens once the unit's lessons are done.
    const lessonsDone = unit.lessons.every((l) => l.scene || progress.lessons[l.id])

    for (const lesson of unit.lessons) {
      if (!lesson.scene) n += 1
      const isDone = !!progress.lessons[lesson.id]
      let state: NodeState = 'open'
      if (locked) state = 'locked'
      else if (isDone) state = 'done'
      // "Next lesson" can reach a scene early; once played, it stays played.
      else if (lesson.scene && !lessonsDone) state = 'locked'
      else if (!foundCurrent) { state = 'current'; foundCurrent = true }
      rows.push({ kind: 'node', lesson, state, n, x: SWING[nodeIndex % SWING.length] })
      nodeIndex += 1
    }
  })

  // Geometry for the trail line. Unit bands take a row too.
  const points: Array<{ x: number; y: number; done: boolean }> = []
  rows.forEach((row, i) => {
    if (row.kind === 'node') points.push({ x: row.x, y: i * ROW + NODE / 2, done: row.state === 'done' })
  })
  const height = rows.length * ROW

  const segment = (a: (typeof points)[number], b: (typeof points)[number]) => {
    const cy = (a.y + b.y) / 2
    return `M ${a.x} ${a.y} C ${a.x} ${cy}, ${b.x} ${cy}, ${b.x} ${b.y}`
  }
  // A segment lights up when the node it leaves from is done. Lessons can be
  // finished out of order, so this is per-segment rather than "up to the last
  // completed node" -- which drew the course colour through unfinished ones.
  const segments = points.slice(1).map((b, i) => ({ d: segment(points[i], b), lit: points[i].done }))

  return (
    <main className="mx-auto w-full max-w-lg px-5 pb-24 pt-4">
      <div className="relative" style={{ height }}>
        {/* The trail. Drawn in the centre column; nodes are offset from it. */}
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
          viewBox={`-160 0 320 ${height}`}
          preserveAspectRatio="xMidYMin meet"
          aria-hidden="true"
        >
          {segments.map((seg, i) => (
            <path key={i} d={seg.d} fill="none" strokeWidth="6" strokeLinecap="round"
              stroke={seg.lit ? 'var(--accent)' : 'var(--ink-faint)'}
              strokeOpacity={seg.lit ? 1 : 0.45}
              strokeDasharray={seg.lit ? undefined : '1 14'}
              pathLength={seg.lit ? 1 : undefined}
              style={seg.lit ? { strokeDasharray: 1, strokeDashoffset: 1, animation: `draw 700ms ${i * 120}ms cubic-bezier(.2,.8,.2,1) forwards` } : undefined}
            />
          ))}
        </svg>

        {rows.map((row, i) => {
          const top = i * ROW
          if (row.kind === 'unit') {
            return (
              <div
                key={row.unit.id}
                className="absolute inset-x-0 flex items-center justify-center"
                style={{ top: top + NODE / 2 - 20 }}
              >
                <div
                  className={`animate-rise flex items-center gap-2 rounded-full px-4 py-2 shadow-[var(--shadow)] ${
                    row.locked ? 'bg-surface-sunk text-ink-faint' : 'bg-surface text-ink'
                  }`}
                >
                  <span aria-hidden="true">{row.locked ? '🔒' : row.unit.emoji}</span>
                  <span className="display font-bold">{row.unit.title}</span>
                  <span className="text-xs text-ink-faint">{row.done}/{row.unit.lessons.length}</span>
                </div>
              </div>
            )
          }

          const { lesson, state, x } = row
          const label = (
            <span className="mt-2 block w-36 text-center text-xs font-semibold leading-tight text-ink-soft">
              {lesson.scene && <span className="display block text-[10px] font-extrabold uppercase tracking-[0.2em] text-accent">Scene</span>}
              {lesson.title}
            </span>
          )

          const circle: Record<NodeState, string> = {
            done:    'bg-accent text-accent-ink shadow-[var(--shadow)]',
            current: 'bg-surface text-ink ring-4 ring-accent shadow-[var(--shadow-lift)] animate-pulse-ring',
            open:    'bg-surface text-ink shadow-[var(--shadow)]',
            locked:  'bg-surface-sunk text-ink-faint border-2 border-dashed border-line',
          }

          const face = (
            <span
              className={`grid place-items-center text-3xl ${lesson.scene ? 'rounded-[28px]' : 'rounded-full'} ${circle[state]}`}
              style={{ width: NODE, height: NODE }}
              aria-hidden="true"
            >
              {state === 'done' ? '✓' : state === 'locked' ? '' : lessonIcon(lesson.title)}
            </span>
          )

          return (
            <div
              key={lesson.id}
              className="absolute flex flex-col items-center"
              style={{ top, left: `calc(50% + ${x}px)`, transform: 'translateX(-50%)' }}
            >
              {state === 'locked' ? (
                <div aria-disabled="true" aria-label={`${lesson.scene ? 'Scene' : `Lesson ${row.n}`}: ${lesson.title}, locked`} className="flex flex-col items-center opacity-60">
                  {face}{label}
                </div>
              ) : (
                <Link
                  href={`/${lang}/lesson/${lesson.id}`}
                  aria-label={`${lesson.scene ? 'Scene' : `Lesson ${row.n}`}: ${lesson.title}${state === 'done' ? ', complete' : ''}`}
                  className="press flex flex-col items-center"
                >
                  {state === 'current' && (
                    <span className="display absolute -top-8 rounded-full bg-accent px-3 py-1 text-xs font-bold text-accent-ink animate-breathe">
                      Start
                    </span>
                  )}
                  {face}{label}
                </Link>
              )}
            </div>
          )
        })}
      </div>
    </main>
  )
}
