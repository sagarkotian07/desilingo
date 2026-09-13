'use client'

import { useMemo } from 'react'

/** A one-shot scatter of the course colours. Pure CSS, aria-hidden. */
export function Burst({ count = 22 }: { count?: number }) {
  const pieces = useMemo(
    () => Array.from({ length: count }, (_, i) => {
      const angle = (i / count) * Math.PI * 2 + (i % 3) * 0.3
      const dist = 120 + (i % 5) * 32
      return {
        dx: `${Math.cos(angle) * dist}px`,
        dy: `${Math.sin(angle) * dist - 40}px`,
        delay: `${(i % 6) * 30}ms`,
        color: ['var(--accent)', 'var(--marigold)', 'var(--terracotta)', 'var(--leaf)', 'var(--indigo)'][i % 5],
        size: 6 + (i % 3) * 3,
      }
    }),
    [count],
  )
  return (
    <div className="pointer-events-none absolute left-1/2 top-24 -z-0" aria-hidden="true">
      {pieces.map((p, i) => (
        <span
          key={i}
          className="absolute rounded-full"
          style={{
            width: p.size, height: p.size, background: p.color,
            ['--dx' as string]: p.dx, ['--dy' as string]: p.dy,
            animation: `burst 900ms cubic-bezier(.2,.8,.2,1) ${p.delay} forwards`,
          }}
        />
      ))}
    </div>
  )
}
