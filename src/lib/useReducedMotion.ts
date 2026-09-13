'use client'

import { useSyncExternalStore } from 'react'

const QUERY = '(prefers-reduced-motion: reduce)'

function subscribe(listener: () => void): () => void {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {}
  const mq = window.matchMedia(QUERY)
  mq.addEventListener('change', listener)
  return () => mq.removeEventListener('change', listener)
}

/**
 * Honours the OS reduced-motion setting.
 *
 * The CSS already clamps declarative animations, but timer-driven effects like
 * the grapheme reveal and the typewriter run in JavaScript and would otherwise
 * ignore the preference entirely -- which is exactly the kind of motion that
 * causes trouble for people who ask for less of it.
 */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => (typeof window !== 'undefined' && window.matchMedia?.(QUERY).matches) ?? false,
    () => false,
  )
}
