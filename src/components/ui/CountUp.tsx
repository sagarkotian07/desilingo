'use client'

import { useEffect, useState } from 'react'
import { useReducedMotion } from '@/lib/useReducedMotion'

/** Counts from 0 to `to` in ~700ms. */
export function CountUp({ to }: { to: number }) {
  const reduced = useReducedMotion()
  const [shown, setShown] = useState({ to: -1, value: 0 })
  const value = reduced ? to : shown.to === to ? shown.value : 0

  useEffect(() => {
    if (reduced) return
    const start = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 700)
      const eased = 1 - Math.pow(1 - t, 3)
      setShown({ to, value: Math.round(to * eased) })
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [to, reduced])

  return <>{value}</>
}
