'use client'

import { useEffect, useState } from 'react'
import { useReducedMotion } from '@/lib/useReducedMotion'

const STEP_MS = 30

/** Types a short instruction in. Reserves its final height so nothing shifts. */
export function Typewriter({ text, className = '' }: { text: string; className?: string }) {
  const reduced = useReducedMotion()
  const [progress, setProgress] = useState({ key: '', shown: 0 })
  const shown = reduced ? text.length : progress.key === text ? progress.shown : 0

  useEffect(() => {
    if (reduced) return
    let i = 0
    const id = setInterval(() => {
      i += 1
      setProgress({ key: text, shown: i })
      if (i >= text.length) clearInterval(id)
    }, STEP_MS)
    return () => clearInterval(id)
  }, [text, reduced])

  return (
    <span className={`relative inline-block ${className}`}>
      <span className="invisible" aria-hidden="true">{text}</span>
      <span className="absolute inset-0">
        <span className="sr-only">{text}</span>
        <span aria-hidden="true">{text.slice(0, shown)}</span>
      </span>
    </span>
  )
}
