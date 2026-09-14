'use client'

import { useEffect, useRef } from 'react'
import { useSeason } from '@/lib/useSeason'
import { useReducedMotion } from '@/lib/useReducedMotion'
import { startSeason } from '@/lib/seasons'

/** Petals in spring, snow in winter: one canvas behind every page. */
export function SeasonBackdrop() {
  const { season } = useSeason()
  const reduced = useReducedMotion()
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    return startSeason(canvas, season, !reduced)
  }, [season, reduced])

  return <canvas ref={ref} className="season-backdrop" aria-hidden="true" />
}
